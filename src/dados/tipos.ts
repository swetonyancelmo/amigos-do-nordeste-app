export type Situacao = 'RASCUNHO' | 'PRONTO' | 'ENVIADO' | 'ACEITO' | 'DEVOLVIDO';

export type Sexo = 'F' | 'M';

export type Pessoa = {
  id: string;
  nome: string | null;
  cadastroIncompleto: boolean;
  sexo: Sexo | null;
  /** AAAA-MM-DD. Nulo quando ninguém sabe a data — o caso mais comum. */
  dataNascimento: string | null;
  /** Idade em anos, informada de cabeça pela família. */
  idadeEstimada: number | null;
  /** AAAA-MM-DD em que a estimativa foi feita. Sem isso a estimativa não serve. */
  idadeEstimadaEm: string | null;
  ordem: number;
};

export type PreCadastro = {
  /** uuid gerado no aparelho. É a chave de idempotência no envio. */
  id: string;
  responsavelNome: string;
  telefone: string | null;
  comunidadeId: string | null;
  comunidadeNome: string | null;
  pontoReferencia: string | null;
  situacao: Situacao;
  motivoDevolucao: string | null;
  criadoEm: string;
  atualizadoEm: string;
  enviadoEm: string | null;
  pessoas: Pessoa[];
};

/** O que o app manda para POST /api/pre-cadastros. */
export type EnvioPreCadastro = Omit<
  PreCadastro,
  'situacao' | 'motivoDevolucao' | 'atualizadoEm' | 'enviadoEm'
>;

/** Resposta por item do envio em lote. */
export type ResultadoEnvio = {
  id: string;
  situacao: 'ACEITO' | 'JA_RECEBIDO' | 'ERRO';
  mensagem?: string;
};
