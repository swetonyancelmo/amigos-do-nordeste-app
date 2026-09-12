/**
 * Banco local (SQLite) do aparelho da agente.
 *
 * DUAS REGRAS que valem para tudo aqui:
 *
 * 1. Este banco NUNCA recebe a base de famílias do servidor. Ele só guarda o
 *    que ESTA agente digitou, até ser enviado. É uma fila de saída, não uma
 *    cópia do sistema. Ver docs/decisoes/ADR-0001.
 *
 * 2. O `id` de cada pré-cadastro é gerado AQUI, no aparelho, e viaja para o
 *    servidor. É ele que impede duplicata quando a agente toca em "enviar"
 *    duas vezes ou a internet cai depois de o servidor já ter gravado.
 */
import * as SQLite from 'expo-sqlite';

const NOME = 'cadastro-and.db';

let conexao: SQLite.SQLiteDatabase | null = null;

export async function abrirBanco(): Promise<SQLite.SQLiteDatabase> {
  if (conexao) return conexao;
  conexao = await SQLite.openDatabaseAsync(NOME);
  await migrar(conexao);
  return conexao;
}

/**
 * Migrações versionadas, no mesmo espírito do Flyway do backend: cada mudança
 * de schema é um passo novo, nunca uma edição de um passo que já rodou.
 * O aparelho da agente pode estar em qualquer versão quando o APK atualizar.
 */
const PASSOS: Array<(db: SQLite.SQLiteDatabase) => Promise<void>> = [
  // 1 — tabelas iniciais
  async db => {
    await db.execAsync(`
      CREATE TABLE pre_cadastro (
        id                TEXT PRIMARY KEY,      -- uuid gerado no aparelho
        responsavel_nome  TEXT NOT NULL,
        telefone          TEXT,
        comunidade_id     TEXT,
        comunidade_nome   TEXT,
        ponto_referencia  TEXT,
        situacao          TEXT NOT NULL,         -- RASCUNHO | PRONTO | ENVIADO | ACEITO | DEVOLVIDO
        motivo_devolucao  TEXT,
        criado_em         TEXT NOT NULL,
        atualizado_em     TEXT NOT NULL,
        enviado_em        TEXT
      );

      CREATE TABLE pessoa (
        id                  TEXT PRIMARY KEY,
        pre_cadastro_id     TEXT NOT NULL REFERENCES pre_cadastro(id) ON DELETE CASCADE,
        nome                TEXT,               -- pode ser nulo: "filha de Jane"
        cadastro_incompleto INTEGER NOT NULL DEFAULT 0,
        sexo                TEXT,
        data_nascimento     TEXT,               -- AAAA-MM-DD
        idade_estimada      INTEGER,
        idade_estimada_em   TEXT,               -- AAAA-MM-DD, quando foi estimada
        ordem               INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX idx_pessoa_pre ON pessoa (pre_cadastro_id);
      CREATE INDEX idx_pre_situacao ON pre_cadastro (situacao);
    `);
  },
];

async function migrar(db: SQLite.SQLiteDatabase) {
  const linha = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let versao = linha?.user_version ?? 0;

  for (let i = versao; i < PASSOS.length; i++) {
    await PASSOS[i](db);
    versao = i + 1;
    // PRAGMA não aceita parâmetro ligado, e o valor aqui é inteiro nosso.
    await db.execAsync(`PRAGMA user_version = ${versao}`);
  }
}

/** Só para os testes: apaga tudo e recria. Nunca chamar em produção. */
export async function _limparParaTeste() {
  const db = await abrirBanco();
  await db.execAsync('DELETE FROM pessoa; DELETE FROM pre_cadastro;');
}
