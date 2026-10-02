/**
 * O envio. É a parte mais fácil de errar do app inteiro.
 *
 * A REGRA: o `id` de cada pré-cadastro nasce no aparelho e vai junto na
 * requisição. O servidor trata como chave de idempotência — se já tiver esse
 * id, responde JA_RECEBIDO em vez de criar outra família.
 *
 * Isso cobre os dois casos que acontecem de verdade em campo:
 *   1. a agente toca em "enviar" duas vezes;
 *   2. o servidor grava, a internet cai antes da resposta chegar, e o app
 *      tenta de novo achando que falhou.
 *
 * Sem isso, a associação recebe família repetida e descobre só na revisão.
 *
 * Depois de enviar, o app pergunta ao servidor como estão os que já tinham ido
 * (GET /api/pre-cadastros/situacao): aprovado vira ACEITO, devolvido vira
 * DEVOLVIDO com o motivo. É só id, situação e motivo — nenhum dado de família
 * desce para o aparelho.
 *
 * Nem toda recusa é passageira:
 *   - 401/403: o celular perdeu o acesso (convite reemitido, agente
 *     desativada). Repetir não adianta; a agente precisa de código novo.
 *   - 400: o servidor recusou o conteúdo. Repetir dá o mesmo 400, para sempre;
 *     o cadastro volta para a agente corrigir, como um devolvido.
 */
import { apiGet, apiPost } from './api';
import { listarIdsEnviados, listarPendentes, marcarSituacao } from './fila';
import type { EnvioPreCadastro, ResultadoEnvio, SituacaoNoServidor } from './tipos';

export type ResumoSincronizacao = {
  enviados: number;
  jaRecebidos: number;
  comErro: number;
  semInternet: boolean;
  /** 401/403: o token do aparelho não vale mais. O envio parou. */
  semAcesso: boolean;
  /** 400: voltaram para a agente corrigir (marcados DEVOLVIDO no aparelho). */
  recusados: number;
  /** Na consulta de situação: quantos a associação aprovou desde a última vez. */
  aprovados: number;
  /** Na consulta de situação: quantos a associação devolveu desde a última vez. */
  devolvidos: number;
};

/** O texto que a tela de devolvido mostra para um envio recusado pelo servidor. */
export const MOTIVO_RECUSA =
  'Este cadastro não pôde ser recebido como está. Confira os nomes, o telefone e o ponto de ' +
  'referência (texto muito longo, por exemplo) e envie de novo.';

/** Ids por consulta de situação — o mesmo teto da API. */
const IDS_POR_CONSULTA = 100;

/**
 * Status HTTP de um ErroDaApi, ou nulo. Pelo nome, e não por instanceof,
 * para não depender da classe exportada por api.ts (os testes trocam o
 * módulo inteiro).
 */
function statusDaApi(erro: unknown): number | null {
  const e = erro as { name?: unknown; status?: unknown } | null;
  return e?.name === 'ErroDaApi' && typeof e.status === 'number' ? e.status : null;
}

type AoProgredir = (feitos: number, total: number) => void;

let emAndamento: Promise<ResumoSincronizacao> | null = null;
const ouvintes = new Set<AoProgredir>();

/**
 * Um envio por vez no aparelho inteiro. Dois toques rápidos em "Enviar agora"
 * abrem duas telas de envio; sem isto, as duas leriam a mesma fila e
 * mandariam o mesmo cadastro duas vezes. Quem chega com um envio já andando
 * entra nele: acompanha o mesmo progresso e recebe o mesmo resumo.
 */
export function sincronizar(aoProgredir?: AoProgredir): Promise<ResumoSincronizacao> {
  if (aoProgredir) ouvintes.add(aoProgredir);
  if (!emAndamento) {
    emAndamento = enviarFila((feitos, total) => ouvintes.forEach(o => o(feitos, total))).finally(
      () => {
        emAndamento = null;
        ouvintes.clear();
      },
    );
  }
  return emAndamento;
}

async function enviarFila(aoProgredir: AoProgredir): Promise<ResumoSincronizacao> {
  const resumo: ResumoSincronizacao = {
    enviados: 0,
    jaRecebidos: 0,
    comErro: 0,
    semInternet: false,
    semAcesso: false,
    recusados: 0,
    aprovados: 0,
    devolvidos: 0,
  };

  await enviarPendentes(resumo, aoProgredir);
  if (!resumo.semInternet && !resumo.semAcesso) {
    await consultarSituacao(resumo);
  }
  return resumo;
}

async function enviarPendentes(resumo: ResumoSincronizacao, aoProgredir: AoProgredir) {
  const pendentes = await listarPendentes();
  if (pendentes.length === 0) return;

  // Envia um por vez, de propósito. Um lote único falharia inteiro quando a
  // conexão cai no meio; assim o que já passou fica marcado como enviado e
  // a próxima tentativa continua de onde parou.
  let feitos = 0;
  for (const p of pendentes) {
    const corpo: EnvioPreCadastro = {
      id: p.id,
      responsavelNome: p.responsavelNome,
      telefone: p.telefone,
      comunidadeId: p.comunidadeId,
      comunidadeNome: p.comunidadeNome,
      pontoReferencia: p.pontoReferencia,
      criadoEm: p.criadoEm,
      pessoas: p.pessoas,
    };

    try {
      const r = await apiPost<ResultadoEnvio>('/api/pre-cadastros', corpo);

      if (r.situacao === 'ACEITO') {
        await marcarSituacao(p.id, 'ENVIADO');
        resumo.enviados++;
      } else if (r.situacao === 'JA_RECEBIDO') {
        // não é erro: é a idempotência funcionando
        await marcarSituacao(p.id, 'ENVIADO');
        resumo.jaRecebidos++;
      } else {
        resumo.comErro++;
      }
    } catch (erro) {
      // Sem rede: para tudo e deixa o resto na fila. Continuar tentando os
      // outros só gastaria bateria e daria a mesma resposta.
      if (erro instanceof SemInternet) {
        resumo.semInternet = true;
        break;
      }
      const status = statusDaApi(erro);
      // Sem acesso, os próximos dariam o mesmo 401: para e deixa tudo na fila.
      if (status === 401 || status === 403) {
        resumo.semAcesso = true;
        break;
      }
      if (status === 400) {
        await marcarSituacao(p.id, 'DEVOLVIDO', MOTIVO_RECUSA);
        resumo.recusados++;
      } else {
        resumo.comErro++;
      }
    }

    aoProgredir(++feitos, pendentes.length);
  }
}

/**
 * Pergunta pelos ENVIADO. Falha aqui não estraga o envio que já aconteceu:
 * sem rede ou com o servidor ocupado, fica para a próxima vez. Só a perda de
 * acesso é contada, porque muda o que a agente precisa fazer.
 */
async function consultarSituacao(resumo: ResumoSincronizacao) {
  const ids = await listarIdsEnviados();
  for (let i = 0; i < ids.length; i += IDS_POR_CONSULTA) {
    const lote = ids.slice(i, i + IDS_POR_CONSULTA);
    let respostas: SituacaoNoServidor[];
    try {
      respostas = await apiGet<SituacaoNoServidor[]>(`/api/pre-cadastros/situacao?ids=${lote.join(',')}`);
    } catch (erro) {
      const status = statusDaApi(erro);
      if (status === 401 || status === 403) resumo.semAcesso = true;
      return;
    }
    for (const r of respostas) {
      if (r.situacao === 'APROVADO') {
        await marcarSituacao(r.id, 'ACEITO');
        resumo.aprovados++;
      } else if (r.situacao === 'DEVOLVIDO') {
        await marcarSituacao(r.id, 'DEVOLVIDO', r.motivoDevolucao);
        resumo.devolvidos++;
      }
    }
  }
}

export class SemInternet extends Error {
  constructor() {
    super('Sem internet');
    this.name = 'SemInternet';
  }
}
