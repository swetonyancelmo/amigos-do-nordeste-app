/**
 * Tamanho máximo de cada texto do pré-cadastro — os mesmos limites do
 * EnviarPreCadastroRequisicao da API. Passou disso, o servidor recusa o envio
 * inteiro (400) e o cadastro fica preso na fila; por isso o campo nem deixa
 * digitar além. Mudou na API, mude aqui.
 */
export const LIMITES = {
  responsavelNome: 120,
  telefone: 20,
  comunidadeNome: 120,
  pontoReferencia: 255,
  nomePessoa: 120,
} as const;
