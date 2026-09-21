import { describe, expect, test } from '@jest/globals';
import { revisar } from '../revisao';
import type { Pessoa, PreCadastro } from '../tipos';

const HOJE = '2026-09-21';

function pessoa(p: Partial<Pessoa>): Pessoa {
  return {
    id: 'p',
    nome: 'Ana',
    cadastroIncompleto: false,
    sexo: 'F',
    dataNascimento: '1990-01-01',
    idadeEstimada: null,
    idadeEstimadaEm: null,
    ordem: 0,
    ...p,
  };
}

function cadastro(c: Partial<PreCadastro>): PreCadastro {
  return {
    id: 'c',
    responsavelNome: 'Responsável',
    telefone: null,
    comunidadeId: null,
    comunidadeNome: null,
    pontoReferencia: null,
    situacao: 'RASCUNHO',
    motivoDevolucao: null,
    criadoEm: '2026-09-21T10:00:00Z',
    atualizadoEm: '2026-09-21T10:00:00Z',
    enviadoEm: null,
    pessoas: [pessoa({})],
    ...c,
  };
}

describe('revisar', () => {
  test('rascunho com responsável e uma pessoa pode ser salvo', () => {
    expect(revisar(cadastro({}), HOJE)).toEqual({
      impedimento: null,
      jaEnviado: false,
      semNome: 0,
      semIdade: 0,
    });
  });

  test('salvar de novo um cadastro PRONTO não é impedido', () => {
    expect(revisar(cadastro({ situacao: 'PRONTO' }), HOJE).impedimento).toBeNull();
  });

  test('sem responsável não salva', () => {
    expect(revisar(cadastro({ responsavelNome: '   ' }), HOJE).impedimento).toMatch(/responsável/);
  });

  test('sem ninguém na casa não salva', () => {
    expect(revisar(cadastro({ pessoas: [] }), HOJE).impedimento).toMatch(/pelo menos uma pessoa/);
  });

  test.each(['ENVIADO', 'ACEITO', 'DEVOLVIDO'] as const)('%s já saiu do celular', situacao => {
    const r = revisar(cadastro({ situacao }), HOJE);
    expect(r.jaEnviado).toBe(true);
    expect(r.impedimento).not.toBeNull();
  });

  test('pessoa sem nome e sem idade não impede, só é contada', () => {
    const r = revisar(
      cadastro({
        pessoas: [
          pessoa({ id: '1', nome: null, cadastroIncompleto: true }),
          pessoa({ id: '2', dataNascimento: null }),
          // estimativa sem a data em que foi dita não vale
          pessoa({ id: '3', dataNascimento: null, idadeEstimada: 7, idadeEstimadaEm: null }),
          pessoa({ id: '4', dataNascimento: null, idadeEstimada: 7, idadeEstimadaEm: '2025-03-01' }),
        ],
      }),
      HOJE,
    );
    expect(r.impedimento).toBeNull();
    expect(r.semNome).toBe(1);
    expect(r.semIdade).toBe(2);
  });
});
