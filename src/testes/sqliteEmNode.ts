/**
 * Só para os testes: o pedaço do `expo-sqlite` que o app usa, em cima do
 * `node:sqlite` do próprio Node. Nunca importar fora de teste.
 *
 * Grava em arquivo de verdade (numa pasta temporária por arquivo de teste),
 * para que fechar e abrir de novo seja o mesmo que a agente fechar o app e
 * voltar: o que não chegou ao disco não volta.
 *
 * Uso: jest.mock('expo-sqlite', () => jest.requireActual('../../testes/sqliteEmNode'));
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

const PASTA = mkdtempSync(join(tmpdir(), 'cadastro-familias-teste-'));

type Valor = string | number | boolean | null | undefined;

/** Aceita os dois jeitos do expo-sqlite: `(sql, a, b)` e `(sql, [a, b])`. */
function parametros(args: (Valor | Valor[])[]): SQLInputValue[] {
  const lista = (args.length === 1 && Array.isArray(args[0]) ? args[0] : args) as Valor[];
  return lista.map(v => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));
}

class BancoEmNode {
  constructor(private readonly db: DatabaseSync) {}

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async runAsync(sql: string, ...args: (Valor | Valor[])[]) {
    const r = this.db.prepare(sql).run(...parametros(args));
    return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
  }

  async getFirstAsync<T>(sql: string, ...args: (Valor | Valor[])[]): Promise<T | null> {
    const linha = this.db.prepare(sql).get(...parametros(args));
    return linha ? ({ ...linha } as T) : null;
  }

  async getAllAsync<T>(sql: string, ...args: (Valor | Valor[])[]): Promise<T[]> {
    return this.db.prepare(sql).all(...parametros(args)).map(l => ({ ...l }) as T);
  }

  async withTransactionAsync(fn: () => Promise<void>): Promise<void> {
    this.db.exec('BEGIN');
    try {
      await fn();
      this.db.exec('COMMIT');
    } catch (erro) {
      this.db.exec('ROLLBACK');
      throw erro;
    }
  }

  async closeAsync(): Promise<void> {
    this.db.close();
  }
}

export async function openDatabaseAsync(nome: string) {
  return new BancoEmNode(new DatabaseSync(join(PASTA, nome)));
}
