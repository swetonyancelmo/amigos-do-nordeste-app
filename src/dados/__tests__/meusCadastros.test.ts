import { describe, expect, test } from '@jest/globals';
import { descreverLinha, destinoAoTocar, ordenarRecentes, seloDaSituacao } from '../meusCadastros';
import type { Pessoa, PreCadastro } from '../tipos';

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
    situacao: 'PRONTO',
    motivoDevolucao: null,
    criadoEm: '2026-09-21T12:00:00Z',
    atualizadoEm: '2026-09-21T12:00:00Z',
    enviadoEm: null,
    pessoas: [pessoa({})],
    ...c,
  };
}

describe('seloDaSituacao', () => {
  test('esperando envio, aceito e devolvido têm cores diferentes', () => {
    const tons = new Set(
      (['PRONTO', 'ACEITO', 'DEVOLVIDO'] as const).map(s => seloDaSituacao(s).tom),
    );
    expect(tons.size).toBe(3);
  });

  test('o que ainda não foi aceito nem devolvido fica na cor de espera', () => {
    for (const s of ['RASCUNHO', 'PRONTO', 'ENVIADO'] as const) {
      expect(seloDaSituacao(s).tom).toBe('espera');
    }
  });

  test('cada situação tem um texto próprio', () => {
    const textos = (['RASCUNHO', 'PRONTO', 'ENVIADO', 'ACEITO', 'DEVOLVIDO'] as const).map(
      s => seloDaSituacao(s).texto,
    );
    expect(new Set(textos).size).toBe(textos.length);
  });
});

describe('ordenarRecentes', () => {
  test('do mais recente para o mais antigo, pela data do cadastro', () => {
    const lista = [
      cadastro({ id: 'velho', criadoEm: '2026-09-01T10:00:00Z' }),
      cadastro({ id: 'novo', criadoEm: '2026-09-20T10:00:00Z' }),
      cadastro({ id: 'meio', criadoEm: '2026-09-10T10:00:00Z' }),
    ];
    expect(ordenarRecentes(lista).map(c => c.id)).toEqual(['novo', 'meio', 'velho']);
  });

  test('devolvido recentemente não pula para o topo', () => {
    const lista = [
      cadastro({ id: 'devolvido', situacao: 'DEVOLVIDO', criadoEm: '2026-09-01T10:00:00Z', atualizadoEm: '2026-09-21T10:00:00Z' }),
      cadastro({ id: 'novo', criadoEm: '2026-09-20T10:00:00Z' }),
    ];
    expect(ordenarRecentes(lista).map(c => c.id)).toEqual(['novo', 'devolvido']);
  });

  test('não mexe na lista original', () => {
    const lista = [
      cadastro({ id: 'a', criadoEm: '2026-09-01T10:00:00Z' }),
      cadastro({ id: 'b', criadoEm: '2026-09-20T10:00:00Z' }),
    ];
    ordenarRecentes(lista);
    expect(lista.map(c => c.id)).toEqual(['a', 'b']);
  });
});

describe('destinoAoTocar', () => {
  test('devolvido abre a tela de cadastro devolvido', () => {
    expect(destinoAoTocar(cadastro({ id: 'x', situacao: 'DEVOLVIDO' }))).toEqual({
      pathname: '/cadastro/devolvido',
      params: { id: 'x' },
    });
  });

  test.each(['RASCUNHO', 'PRONTO'] as const)('%s abre a revisão', situacao => {
    expect(destinoAoTocar(cadastro({ id: 'x', situacao }))?.pathname).toBe('/cadastro/revisar');
  });

  test.each(['ENVIADO', 'ACEITO'] as const)('%s não abre nada', situacao => {
    expect(destinoAoTocar(cadastro({ situacao }))).toBeNull();
  });
});

describe('descreverLinha', () => {
  // sem o "Z": meio-dia no fuso de quem roda o teste, para a data não virar
  const MEIO_DIA_LOCAL = '2026-09-21T12:00:00';

  test('comunidade, pessoas e data', () => {
    const c = cadastro({
      criadoEm: MEIO_DIA_LOCAL,
      comunidadeNome: 'Sítio Lagoa',
      pessoas: [pessoa({ id: 'a' }), pessoa({ id: 'b' })],
    });
    expect(descreverLinha(c)).toBe('Sítio Lagoa · 2 pessoas · 21/09/2026');
  });

  test('sem comunidade e com uma pessoa', () => {
    expect(descreverLinha(cadastro({ criadoEm: MEIO_DIA_LOCAL }))).toBe('Sem comunidade · 1 pessoa · 21/09/2026');
  });
});
