/**
 * O que a tela `enviados` ("Meus cadastros") decide sobre cada linha, separado
 * da tela para poder ser testado sem React.
 *
 * A lista mostra tudo que está no aparelho, não só o que foi enviado: nada é
 * apagado ao enviar, e a agente precisa ver o que ainda espera, o que a
 * associação aceitou e o que voltou para ela corrigir.
 */
import { hojeLocal } from './idade';
import type { PreCadastro, Situacao } from './tipos';

export type TomSelo = 'espera' | 'aceito' | 'devolvido';

/**
 * Três cores, uma por pergunta que a agente faz ao olhar a lista: "ainda
 * depende de mim ou do servidor?" (âmbar), "entrou?" (verde), "voltou?"
 * (laranja). Rascunho, pronto e enviado são todos espera — o texto diz qual.
 */
const SELOS: Record<Situacao, { texto: string; tom: TomSelo }> = {
  RASCUNHO: { texto: 'NÃO TERMINADO', tom: 'espera' },
  PRONTO: { texto: 'ESPERANDO ENVIO', tom: 'espera' },
  ENVIADO: { texto: 'ESPERANDO APROVAÇÃO', tom: 'espera' },
  ACEITO: { texto: 'ACEITO', tom: 'aceito' },
  DEVOLVIDO: { texto: 'DEVOLVIDO', tom: 'devolvido' },
};

export function seloDaSituacao(s: Situacao): { texto: string; tom: TomSelo } {
  return SELOS[s];
}

/**
 * Do mais recente para o mais antigo, pela data em que o cadastro foi feito na
 * casa — é a data que a agente lembra. A atualização não entra: um devolvido
 * não pode pular para o topo e bagunçar a ordem que ela conhece.
 */
export function ordenarRecentes(lista: readonly PreCadastro[]): PreCadastro[] {
  return [...lista].sort((a, b) =>
    a.criadoEm === b.criadoEm ? a.id.localeCompare(b.id) : a.criadoEm < b.criadoEm ? 1 : -1,
  );
}

export type Destino =
  | { pathname: '/cadastro/devolvido' | '/cadastro/revisar'; params: { id: string } }
  | null;

/**
 * Para onde a linha leva ao ser tocada. Nulo quando não há o que fazer: o
 * cadastro enviado ou aceito já saiu da mão da agente e só aparece para ela
 * saber que chegou.
 */
export function destinoAoTocar(c: PreCadastro): Destino {
  switch (c.situacao) {
    case 'DEVOLVIDO':
      return { pathname: '/cadastro/devolvido', params: { id: c.id } };
    case 'RASCUNHO':
    case 'PRONTO':
      // a revisão mostra o que falta e tem "corrigir" para cada passo
      return { pathname: '/cadastro/revisar', params: { id: c.id } };
    default:
      return null;
  }
}

/** "Sítio Lagoa · 3 pessoas · 21/09/2026" */
export function descreverLinha(c: PreCadastro): string {
  const n = c.pessoas.length;
  const pessoas = n === 1 ? '1 pessoa' : `${n} pessoas`;
  const [a, m, d] = hojeLocal(new Date(c.criadoEm)).split('-');
  return [c.comunidadeNome ?? 'Sem comunidade', pessoas, `${d}/${m}/${a}`].join(' · ');
}
