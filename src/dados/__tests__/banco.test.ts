/**
 * Migrações do banco local: o que um aparelho com APK antigo já tem gravado
 * precisa sobreviver, convertido, à abertura com o código novo.
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('expo-sqlite', () => jest.requireActual('../../testes/sqliteEmNode'));

// eslint-disable-next-line import/first
import { _fecharParaTeste, _limparParaTeste, abrirBanco } from '../banco';
// eslint-disable-next-line import/first
import { buscar } from '../fila';

beforeEach(async () => {
  await _limparParaTeste();
});

describe('passo 3 — sexo com o valor do enum da API', () => {
  test("converte o 'F'/'M' gravado pelo APK antigo, inclusive o que espera na fila", async () => {
    const db = await abrirBanco();
    await db.runAsync(
      `INSERT INTO pre_cadastro (id, responsavel_nome, situacao, criado_em, atualizado_em)
       VALUES ('c1', 'Responsável de Teste', 'PRONTO', '2026-09-20T10:00:00Z', '2026-09-20T10:00:00Z')`,
    );
    await db.runAsync(
      `INSERT INTO pessoa (id, pre_cadastro_id, nome, sexo, ordem) VALUES
         ('p1', 'c1', 'Ana', 'F', 0),
         ('p2', 'c1', 'Bento', 'M', 1),
         ('p3', 'c1', null, null, 2)`,
    );
    // Volta o aparelho para a versão de antes do passo 3 e "atualiza o APK".
    await db.execAsync('PRAGMA user_version = 2');
    await _fecharParaTeste();

    const cadastro = await buscar('c1');

    expect(cadastro?.situacao).toBe('PRONTO');
    expect(cadastro?.pessoas.map(p => p.sexo)).toEqual(['FEMININO', 'MASCULINO', null]);
  });
});
