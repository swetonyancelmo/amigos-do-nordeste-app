import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import type { PreCadastro } from '../tipos';

const mockApiPost = jest.fn<(rota: string, corpo: unknown) => Promise<unknown>>();
const mockListarPendentes = jest.fn<() => Promise<PreCadastro[]>>();
const mockMarcarSituacao = jest.fn<(id: string, situacao: string) => Promise<void>>();

jest.mock('../api', () => ({ apiPost: (...a: [string, unknown]) => mockApiPost(...a) }));
jest.mock('../fila', () => ({
  listarPendentes: () => mockListarPendentes(),
  marcarSituacao: (id: string, s: string) => mockMarcarSituacao(id, s),
}));

// eslint-disable-next-line import/first
import { SemInternet, sincronizar } from '../sincronizar';

function cadastro(id: string): PreCadastro {
  return {
    id,
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
    pessoas: [],
  };
}

beforeEach(() => {
  mockApiPost.mockReset();
  mockMarcarSituacao.mockReset().mockResolvedValue();
  mockListarPendentes.mockReset().mockResolvedValue([cadastro('a'), cadastro('b'), cadastro('c')]);
});

describe('sincronizar', () => {
  test('avisa o progresso a cada cadastro', async () => {
    mockApiPost.mockImplementation(async (_r, corpo) => ({ id: (corpo as PreCadastro).id, situacao: 'ACEITO' }));
    const passos: [number, number][] = [];

    const r = await sincronizar((f, t) => passos.push([f, t]));

    expect(passos).toEqual([[1, 3], [2, 3], [3, 3]]);
    expect(r).toEqual({ enviados: 3, jaRecebidos: 0, comErro: 0, semInternet: false });
  });

  test('sem internet no meio: para, e o que não foi continua na fila', async () => {
    mockApiPost
      .mockResolvedValueOnce({ id: 'a', situacao: 'ACEITO' })
      .mockRejectedValueOnce(new SemInternet());
    const passos: [number, number][] = [];

    const r = await sincronizar((f, t) => passos.push([f, t]));

    expect(r).toEqual({ enviados: 1, jaRecebidos: 0, comErro: 0, semInternet: true });
    expect(passos).toEqual([[1, 3]]);
    // só o que chegou muda de situação; "b" e "c" seguem PRONTO no banco
    expect(mockMarcarSituacao.mock.calls).toEqual([['a', 'ENVIADO']]);
    // nem tenta o terceiro
    expect(mockApiPost).toHaveBeenCalledTimes(2);
  });
});
