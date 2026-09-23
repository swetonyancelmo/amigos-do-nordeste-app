/**
 * A fila de saída. Toda escrita do app passa por aqui.
 *
 * O aparelho é a fonte da verdade até o servidor confirmar. Por isso nada é
 * apagado ao enviar: o registro muda de situação (ENVIADO → ACEITO) e continua
 * no celular, para a agente poder olhar depois. Só some quando ela apaga.
 */
import * as Crypto from 'expo-crypto';
import { abrirBanco } from './banco';
import type { PreCadastro, Pessoa, Situacao } from './tipos';

export function novoId(): string {
  return Crypto.randomUUID();
}

const agora = () => new Date().toISOString();

/* --------------------------------------------------------------- escrita */

export async function salvarRascunho(
  dados: Omit<PreCadastro, 'situacao' | 'motivoDevolucao' | 'criadoEm' | 'atualizadoEm' | 'enviadoEm'>,
  situacao: Situacao = 'RASCUNHO',
): Promise<void> {
  const db = await abrirBanco();
  const t = agora();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO pre_cadastro
         (id, responsavel_nome, telefone, comunidade_id, comunidade_nome,
          ponto_referencia, situacao, criado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         responsavel_nome = excluded.responsavel_nome,
         telefone         = excluded.telefone,
         comunidade_id    = excluded.comunidade_id,
         comunidade_nome  = excluded.comunidade_nome,
         ponto_referencia = excluded.ponto_referencia,
         situacao         = excluded.situacao,
         atualizado_em    = excluded.atualizado_em`,
      dados.id,
      dados.responsavelNome,
      dados.telefone,
      dados.comunidadeId,
      dados.comunidadeNome,
      dados.pontoReferencia,
      situacao,
      t,
      t,
    );

    // as pessoas são reescritas por inteiro: é uma lista curta e evita
    // ter que rastrear quem foi removido na tela.
    await db.runAsync('DELETE FROM pessoa WHERE pre_cadastro_id = ?', dados.id);
    for (const [i, p] of dados.pessoas.entries()) {
      await db.runAsync(
        `INSERT INTO pessoa
           (id, pre_cadastro_id, nome, cadastro_incompleto, sexo,
            data_nascimento, idade_estimada, idade_estimada_em, ordem)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        p.id,
        dados.id,
        p.nome,
        p.cadastroIncompleto ? 1 : 0,
        p.sexo,
        p.dataNascimento,
        p.idadeEstimada,
        p.idadeEstimadaEm,
        i,
      );
    }
  });
}

export async function marcarSituacao(
  id: string,
  situacao: Situacao,
  motivoDevolucao: string | null = null,
): Promise<void> {
  const db = await abrirBanco();
  await db.runAsync(
    `UPDATE pre_cadastro
        SET situacao = ?, motivo_devolucao = ?, atualizado_em = ?,
            enviado_em = CASE WHEN ? = 'ENVIADO' THEN ? ELSE enviado_em END
      WHERE id = ?`,
    situacao,
    motivoDevolucao,
    agora(),
    situacao,
    agora(),
    id,
  );
}

/**
 * Fecha o rascunho: RASCUNHO → PRONTO. É isso que põe o cadastro na fila de
 * envio (e no contador da tela inicial).
 *
 * Só mexe em RASCUNHO ou PRONTO — tocar "salvar" duas vezes não faz mal, mas
 * um cadastro que já foi para o servidor nunca volta para a fila por aqui.
 * Falso quando nada mudou: o cadastro sumiu ou já estava em outra situação.
 */
export async function marcarPronto(id: string): Promise<boolean> {
  const db = await abrirBanco();
  const r = await db.runAsync(
    `UPDATE pre_cadastro
        SET situacao = 'PRONTO', atualizado_em = ?
      WHERE id = ? AND situacao IN ('RASCUNHO', 'PRONTO')`,
    agora(),
    id,
  );
  return r.changes > 0;
}

/**
 * "Corrigir e reenviar" de um cadastro devolvido: DEVOLVIDO → PRONTO, de volta
 * na fila de envio.
 *
 * O motivo fica gravado de propósito: a revisão mostra o que a associação
 * pediu enquanto a agente corrige. Só some quando o cadastro é enviado de novo
 * (`marcarSituacao` para ENVIADO limpa o motivo).
 *
 * Falso quando nada mudou: o cadastro sumiu ou já não estava devolvido.
 */
export async function reabrirDevolvido(id: string): Promise<boolean> {
  const db = await abrirBanco();
  const r = await db.runAsync(
    `UPDATE pre_cadastro
        SET situacao = 'PRONTO', atualizado_em = ?
      WHERE id = ? AND situacao = 'DEVOLVIDO'`,
    agora(),
    id,
  );
  return r.changes > 0;
}

export async function apagar(id: string): Promise<void> {
  const db = await abrirBanco();
  await db.runAsync('DELETE FROM pre_cadastro WHERE id = ?', id);
}

/* ---------------------------------------------------------------- leitura */

type LinhaPre = {
  id: string;
  responsavel_nome: string;
  telefone: string | null;
  comunidade_id: string | null;
  comunidade_nome: string | null;
  ponto_referencia: string | null;
  situacao: Situacao;
  motivo_devolucao: string | null;
  criado_em: string;
  atualizado_em: string;
  enviado_em: string | null;
};

type LinhaPessoa = {
  id: string;
  pre_cadastro_id: string;
  nome: string | null;
  cadastro_incompleto: number;
  sexo: 'F' | 'M' | null;
  data_nascimento: string | null;
  idade_estimada: number | null;
  idade_estimada_em: string | null;
  ordem: number;
};

export async function listarTodos(): Promise<PreCadastro[]> {
  const db = await abrirBanco();
  const pres = await db.getAllAsync<LinhaPre>(
    'SELECT * FROM pre_cadastro ORDER BY criado_em DESC',
  );
  const pessoas = await db.getAllAsync<LinhaPessoa>('SELECT * FROM pessoa ORDER BY ordem');
  return pres.map(l => montar(l, pessoas.filter(p => p.pre_cadastro_id === l.id)));
}

export async function buscar(id: string): Promise<PreCadastro | null> {
  const db = await abrirBanco();
  const l = await db.getFirstAsync<LinhaPre>('SELECT * FROM pre_cadastro WHERE id = ?', id);
  if (!l) return null;
  const pessoas = await db.getAllAsync<LinhaPessoa>(
    'SELECT * FROM pessoa WHERE pre_cadastro_id = ? ORDER BY ordem',
    id,
  );
  return montar(l, pessoas);
}

/**
 * O cadastro que ficou pela metade mais recentemente. É o que a tela do
 * Passo 1 retoma quando a agente fecha o app no meio e volta depois.
 */
export async function buscarRascunhoAberto(): Promise<PreCadastro | null> {
  const db = await abrirBanco();
  const l = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM pre_cadastro WHERE situacao = 'RASCUNHO' ORDER BY atualizado_em DESC LIMIT 1",
  );
  return l ? buscar(l.id) : null;
}

/**
 * O que está na fila para ir ao servidor. É este número que a tela inicial
 * mostra.
 *
 * Devolvido não entra: mandar de novo sem corrigir só devolveria outra vez.
 * Ele volta para a fila quando a agente toca em "Corrigir e reenviar"
 * (`reabrirDevolvido`).
 */
export async function listarPendentes(): Promise<PreCadastro[]> {
  const todos = await listarTodos();
  return todos.filter(p => p.situacao === 'PRONTO');
}

export async function contarPendentes(): Promise<number> {
  const db = await abrirBanco();
  const r = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM pre_cadastro WHERE situacao = 'PRONTO'",
  );
  return r?.n ?? 0;
}

function montar(l: LinhaPre, ps: LinhaPessoa[]): PreCadastro {
  return {
    id: l.id,
    responsavelNome: l.responsavel_nome,
    telefone: l.telefone,
    comunidadeId: l.comunidade_id,
    comunidadeNome: l.comunidade_nome,
    pontoReferencia: l.ponto_referencia,
    situacao: l.situacao,
    motivoDevolucao: l.motivo_devolucao,
    criadoEm: l.criado_em,
    atualizadoEm: l.atualizado_em,
    enviadoEm: l.enviado_em,
    pessoas: ps.map(
      (p): Pessoa => ({
        id: p.id,
        nome: p.nome,
        cadastroIncompleto: p.cadastro_incompleto === 1,
        sexo: p.sexo,
        dataNascimento: p.data_nascimento,
        idadeEstimada: p.idade_estimada,
        idadeEstimadaEm: p.idade_estimada_em,
        ordem: p.ordem,
      }),
    ),
  };
}
