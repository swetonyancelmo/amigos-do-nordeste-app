/**
 * Comunidades que aparecem no Passo 1 do cadastro.
 *
 * PROVISÓRIO: a issue #8 troca esta constante pela lista vinda de
 * GET /api/comunidades, guardada no SQLite na ativação e mostrada com o
 * município. Até lá, os itens de baixo só servem para testar a tela.
 *
 * Quem não está na lista entra por "Outra comunidade", com o nome digitado —
 * vai com `comunidadeId` nulo e a associação acerta na aprovação.
 */
export type Comunidade = { id: string; nome: string };

export const COMUNIDADES: readonly Comunidade[] = [
  { id: 'comunidade-1', nome: 'Comunidade 1' },
  { id: 'comunidade-2', nome: 'Comunidade 2' },
  { id: 'comunidade-3', nome: 'Comunidade 3' },
];
