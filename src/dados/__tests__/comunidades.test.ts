import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockApiGet = jest.fn<(rota: string) => Promise<unknown>>();

jest.mock('../api', () => {
  class ErroDaApi extends Error {
    readonly status: number;
    constructor(status: number, mensagem: string) {
      super(mensagem);
      this.status = status;
    }
  }
  return { apiGet: (rota: string) => mockApiGet(rota), ErroDaApi };
});
jest.mock('../fila', () => ({}));

/* Banco falso: só o suficiente para a tabela `comunidade` e `lista_atualizada`. */
type Linha = { id: string; nome: string; municipio_id: string | null; municipio_nome: string };
const mockBanco = { linhas: [] as Linha[], em: null as string | null };

jest.mock('../banco', () => ({
  abrirBanco: async () => ({
    getAllAsync: async () => mockBanco.linhas.map(l => ({ ...l })),
    getFirstAsync: async () => (mockBanco.em ? { em: mockBanco.em } : null),
    withTransactionAsync: async (fn: () => Promise<void>) => fn(),
    runAsync: async (sql: string, ...args: (string | null)[]) => {
      if (sql.startsWith('DELETE FROM comunidade')) mockBanco.linhas = [];
      else if (sql.startsWith('INSERT INTO comunidade')) {
        const [id, nome, municipio_id, municipio_nome] = args;
        mockBanco.linhas.push({ id: id!, nome: nome!, municipio_id, municipio_nome: municipio_nome! });
      } else if (sql.includes('INSERT INTO lista_atualizada')) mockBanco.em = args[1];
    },
  }),
}));

// eslint-disable-next-line import/first
import { ErroDaApi } from '../api';
// eslint-disable-next-line import/first
import {
  atualizarComunidades,
  comunidadesAtualizadasEm,
  listarComunidades,
  mensagemFalhaAtualizar,
  paraLocal,
  rotuloComunidade,
  textoAtualizadaEm,
} from '../comunidades';
// eslint-disable-next-line import/first
import { SemInternet } from '../sincronizar';

/**
 * Uma comunidade como o servidor poderia mandar. A rota /opcoes já vem sem
 * líder nem coordenadas; eles estão aqui para provar que, se vierem, o
 * aparelho não guarda.
 */
function doServidor(id: string, nome: string, municipioNome: string) {
  return {
    id,
    nome,
    municipioId: `mun-${municipioNome}`,
    municipioNome,
    tipo: 'SITIO',
    liderNome: 'Líder',
    liderTelefone: '(87) 90000-0000',
    latitude: -9.1,
    longitude: -38.3,
    observaces: null,
  };
}

beforeEach(() => {
  mockApiGet.mockReset();
  mockBanco.linhas = [];
  mockBanco.em = null;
});

describe('rotuloComunidade', () => {
  test('mostra a comunidade com o município', () => {
    expect(rotuloComunidade({ nome: 'Sítio Igrejinha', municipioNome: 'Petrolândia' })).toBe(
      'Sítio Igrejinha · Petrolândia',
    );
  });
});

describe('paraLocal', () => {
  test('guarda só id, nome e município — nada do líder nem coordenadas', () => {
    const [c] = paraLocal([doServidor('1', 'Sítio Igrejinha', 'Petrolândia')]);
    expect(c).toEqual({
      id: '1',
      nome: 'Sítio Igrejinha',
      municipioId: 'mun-Petrolândia',
      municipioNome: 'Petrolândia',
    });
  });

  test('comunidade sem município é descartada', () => {
    const lista = paraLocal([
      doServidor('1', 'Igrejinha', 'Petrolândia'),
      { ...doServidor('2', 'Igrejinha', ''), municipioNome: null },
      { id: '3', nome: 'Sem município' },
    ]);
    expect(lista.map(c => c.id)).toEqual(['1']);
  });

  test('ordena por nome ignorando acento, e nomes iguais pelo município', () => {
    const lista = paraLocal([
      doServidor('1', 'Igrejinha', 'Tacaratu'),
      doServidor('2', 'Baixio', 'Petrolândia'),
      doServidor('3', 'Água Branca', 'Petrolândia'),
      doServidor('4', 'Igrejinha', 'Petrolândia'),
    ]);
    expect(lista.map(rotuloComunidade)).toEqual([
      'Água Branca · Petrolândia',
      'Baixio · Petrolândia',
      'Igrejinha · Petrolândia',
      'Igrejinha · Tacaratu',
    ]);
  });

  test('resposta que não é lista é erro, não lista vazia', () => {
    expect(() => paraLocal({ conteudo: [] })).toThrow();
  });
});

describe('atualizarComunidades', () => {
  test('baixa de GET /api/comunidades/opcoes e guarda no aparelho', async () => {
    mockApiGet.mockResolvedValue([
      doServidor('1', 'Sítio Igrejinha', 'Petrolândia'),
      doServidor('2', 'Baixio', 'Tacaratu'),
    ]);

    await expect(atualizarComunidades()).resolves.toBe(2);

    expect(mockApiGet).toHaveBeenCalledWith('/api/comunidades/opcoes');
    expect((await listarComunidades()).map(rotuloComunidade)).toEqual([
      'Baixio · Tacaratu',
      'Sítio Igrejinha · Petrolândia',
    ]);
    expect(await comunidadesAtualizadasEm()).not.toBeNull();
  });

  test('sem internet, a lista guardada continua lá (funciona offline)', async () => {
    mockApiGet.mockResolvedValueOnce([doServidor('1', 'Sítio Igrejinha', 'Petrolândia')]);
    await atualizarComunidades();
    const em = await comunidadesAtualizadasEm();

    mockApiGet.mockRejectedValueOnce(new SemInternet());
    await expect(atualizarComunidades()).rejects.toBeInstanceOf(SemInternet);

    expect((await listarComunidades()).map(c => c.id)).toEqual(['1']);
    expect(await comunidadesAtualizadasEm()).toBe(em);
  });

  test('atualizar troca a lista inteira: quem saiu do servidor sai do aparelho', async () => {
    mockApiGet.mockResolvedValueOnce([
      doServidor('1', 'Igrejinha', 'Petrolândia'),
      doServidor('2', 'Baixio', 'Tacaratu'),
    ]);
    await atualizarComunidades();

    mockApiGet.mockResolvedValueOnce([doServidor('2', 'Baixio', 'Tacaratu')]);
    await atualizarComunidades();

    expect((await listarComunidades()).map(c => c.id)).toEqual(['2']);
  });

  test('resposta vazia não apaga a lista que a agente já tem', async () => {
    mockApiGet.mockResolvedValueOnce([doServidor('1', 'Igrejinha', 'Petrolândia')]);
    await atualizarComunidades();

    mockApiGet.mockResolvedValueOnce([]);
    await expect(atualizarComunidades()).resolves.toBe(1);

    expect((await listarComunidades()).map(c => c.id)).toEqual(['1']);
  });
});

describe('textos para a agente', () => {
  test('data da última atualização', () => {
    expect(textoAtualizadaEm(null)).toBe('A lista ainda não foi baixada.');
    const em = new Date(2026, 8, 5, 14, 30).toISOString();
    expect(textoAtualizadaEm(em)).toBe('Lista atualizada em 05/09/2026.');
  });

  test('falha ao atualizar diz o que fazer, sem jargão', () => {
    expect(mensagemFalhaAtualizar(new SemInternet())).toMatch(/Sem internet/);
    expect(mensagemFalhaAtualizar(new ErroDaApi(403, 'Forbidden'))).toMatch(/Avise a associação/);
    expect(mensagemFalhaAtualizar(new Error('qualquer'))).toMatch(/continua valendo/);
  });
});
