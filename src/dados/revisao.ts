/**
 * O que a tela `cadastro/revisar` decide antes de deixar salvar, separado da
 * tela para poder ser testado sem React.
 *
 * Só duas coisas impedem salvar: não ter quem responda pela casa e não ter
 * ninguém morando nela. Pessoa sem nome ou sem idade NÃO impede — aparece como
 * lembrete, e a associação completa na aprovação. Travar aqui seria a agente
 * desistir do cadastro na porta da casa.
 */
import { idadeEm } from './idade';
import type { PreCadastro } from './tipos';

export type Revisao = {
  /** Nulo quando dá para salvar; senão, o porquê, para mostrar na tela. */
  impedimento: string | null;
  /** O cadastro já saiu da mão da agente (enviado, aceito ou devolvido). */
  jaEnviado: boolean;
  semNome: number;
  semIdade: number;
};

export function revisar(c: PreCadastro, hoje: string): Revisao {
  const jaEnviado = c.situacao !== 'RASCUNHO' && c.situacao !== 'PRONTO';
  let impedimento: string | null = null;
  if (jaEnviado) impedimento = 'Este cadastro já foi enviado.';
  else if (c.responsavelNome.trim() === '') impedimento = 'Falta o nome do responsável.';
  else if (c.pessoas.length === 0) impedimento = 'Ponha pelo menos uma pessoa que mora na casa.';

  return {
    impedimento,
    jaEnviado,
    semNome: c.pessoas.filter(p => p.cadastroIncompleto || !p.nome?.trim()).length,
    semIdade: c.pessoas.filter(p => idadeEm(p, hoje) === null).length,
  };
}
