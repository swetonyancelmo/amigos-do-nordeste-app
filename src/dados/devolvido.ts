/**
 * O que a tela `cadastro/devolvido` decide, separado da tela para poder ser
 * testado sem React.
 *
 * O motivo é o que a dona escreveu na tela de revisão do sistema web, e a
 * agente precisa ler exatamente aquilo: nada de cortar, resumir ou juntar
 * linhas. Só o motivo em branco ganha uma frase no lugar, para a tela não
 * mostrar uma caixa vazia.
 */
import type { PreCadastro } from './tipos';

export const SEM_MOTIVO =
  'A associação não escreveu o motivo. Confira os dados com a família e envie de novo.';

/** O motivo como veio do servidor, ou `SEM_MOTIVO` quando veio em branco. */
export function motivoParaMostrar(c: Pick<PreCadastro, 'motivoDevolucao'>): string {
  const m = c.motivoDevolucao;
  return m && m.trim() !== '' ? m : SEM_MOTIVO;
}

/** Tocar em "corrigir" só faz sentido enquanto o cadastro está devolvido. */
export function podeCorrigir(c: Pick<PreCadastro, 'situacao'>): boolean {
  return c.situacao === 'DEVOLVIDO';
}
