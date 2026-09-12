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
 */
import { apiPost } from './api';
import { listarPendentes, marcarSituacao } from './fila';
import type { EnvioPreCadastro, ResultadoEnvio } from './tipos';

export type ResumoSincronizacao = {
  enviados: number;
  jaRecebidos: number;
  comErro: number;
  semInternet: boolean;
};

export async function sincronizar(
  aoProgredir?: (feitos: number, total: number) => void,
): Promise<ResumoSincronizacao> {
  const pendentes = await listarPendentes();
  const resumo: ResumoSincronizacao = {
    enviados: 0,
    jaRecebidos: 0,
    comErro: 0,
    semInternet: false,
  };
  if (pendentes.length === 0) return resumo;

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
      resumo.comErro++;
    }

    aoProgredir?.(++feitos, pendentes.length);
  }

  return resumo;
}

export class SemInternet extends Error {
  constructor() {
    super('Sem internet');
    this.name = 'SemInternet';
  }
}
