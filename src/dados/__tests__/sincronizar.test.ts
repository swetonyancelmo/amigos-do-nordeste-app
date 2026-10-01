import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import type { PreCadastro } from '../tipos';

const mockApiPost = jest.fn<(rota: string, corpo: unknown) => Promise<unknown>>();
const mockApiGet = jest.fn<(rota: string) => Promise<unknown>>();
const mockListarPendentes = jest.fn<() => Promise<PreCadastro[]>>();
const mockListarIdsEnviados = jest.fn<() => Promise<string[]>>();
const mockMarcarSituacao = jest.fn<(id: string, situacao: string, motivo?: string | null) => Promise<void>>();

jest.mock('../api', () => ({
  apiPost: (...a: [string, unknown]) => mockApiPost(...a),
  apiGet: (r: string) => mockApiGet(r),
}));
jest.mock('../fila', () => ({
  listarPendentes: () => mockListarPendentes(),
  listarIdsEnviados: () => mockListarIdsEnviados(),
  marcarSituacao: (id: string, s: string, m?: string | null) =>
    m === undefined ? mockMarcarSituacao(id, s) : mockMarcarSituacao(id, s, m),
}));

// eslint-disable-next-line import/first
import { MOTIVO_RECUSA, SemInternet, sincronizar } from '../sincronizar';

/** Como o ErroDaApi de api.ts: o sincronizar reconhece pelo nome e pelo status. */
function erroDaApi(status: number): Error {
  return Object.assign(new Error('{}'), { name: 'ErroDaApi', status });
}

const RESUMO_ZERADO = {
  enviados: 0,
  jaRecebidos: 0,
  comErro: 0,
  semInternet: false,
  semAcesso: false,
  recusados: 0,
  aprovados: 0,
  devolvidos: 0,
};

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
  mockApiGet.mockReset().mockResolvedValue([]);
  mockListarIdsEnviados.mockReset().mockResolvedValue([]);
  mockMarcarSituacao.mockReset().mockResolvedValue();
  mockListarPendentes.mockReset().mockResolvedValue([cadastro('a'), cadastro('b'), cadastro('c')]);
});

describe('sincronizar', () => {
  test('avisa o progresso a cada cadastro', async () => {
    mockApiPost.mockImplementation(async (_r, corpo) => ({ id: (corpo as PreCadastro).id, situacao: 'ACEITO' }));
    const passos: [number, number][] = [];

    const r = await sincronizar((f, t) => passos.push([f, t]));

    expect(passos).toEqual([[1, 3], [2, 3], [3, 3]]);
    expect(r).toEqual({ ...RESUMO_ZERADO, enviados: 3 });
  });

  test('sem internet no meio: para, e o que não foi continua na fila', async () => {
    mockApiPost
      .mockResolvedValueOnce({ id: 'a', situacao: 'ACEITO' })
      .mockRejectedValueOnce(new SemInternet());
    const passos: [number, number][] = [];

    const r = await sincronizar((f, t) => passos.push([f, t]));

    expect(r).toEqual({ ...RESUMO_ZERADO, enviados: 1, semInternet: true });
    expect(passos).toEqual([[1, 3]]);
    // só o que chegou muda de situação; "b" e "c" seguem PRONTO no banco
    expect(mockMarcarSituacao.mock.calls).toEqual([['a', 'ENVIADO']]);
    // nem tenta o terceiro
    expect(mockApiPost).toHaveBeenCalledTimes(2);
  });

  test('401 para o envio: o celular perdeu o acesso e o resto fica na fila', async () => {
    mockApiPost
      .mockResolvedValueOnce({ id: 'a', situacao: 'ACEITO' })
      .mockRejectedValueOnce(erroDaApi(401));

    const r = await sincronizar();

    expect(r).toEqual({ ...RESUMO_ZERADO, enviados: 1, semAcesso: true });
    expect(mockApiPost).toHaveBeenCalledTimes(2);
    expect(mockMarcarSituacao.mock.calls).toEqual([['a', 'ENVIADO']]);
    // sem acesso, nem pergunta a situação
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  test('400 volta para a agente corrigir (DEVOLVIDO) e o envio segue com os outros', async () => {
    mockApiPost
      .mockResolvedValueOnce({ id: 'a', situacao: 'ACEITO' })
      .mockRejectedValueOnce(erroDaApi(400))
      .mockResolvedValueOnce({ id: 'c', situacao: 'ACEITO' });

    const r = await sincronizar();

    expect(r).toEqual({ ...RESUMO_ZERADO, enviados: 2, recusados: 1 });
    expect(mockMarcarSituacao.mock.calls).toEqual([
      ['a', 'ENVIADO'],
      ['b', 'DEVOLVIDO', MOTIVO_RECUSA],
      ['c', 'ENVIADO'],
    ]);
  });

  test('500 continua sendo passageiro: fica PRONTO para a próxima vez', async () => {
    mockApiPost.mockRejectedValue(erroDaApi(500));

    const r = await sincronizar();

    expect(r).toEqual({ ...RESUMO_ZERADO, comErro: 3 });
    expect(mockMarcarSituacao).not.toHaveBeenCalled();
  });

  test('depois de enviar, traz o que a associação aprovou e devolveu', async () => {
    mockListarPendentes.mockResolvedValue([]);
    mockListarIdsEnviados.mockResolvedValue(['x', 'y', 'z']);
    mockApiGet.mockResolvedValue([
      { id: 'x', situacao: 'APROVADO', motivoDevolucao: null },
      { id: 'y', situacao: 'DEVOLVIDO', motivoDevolucao: 'Faltou a idade.' },
      { id: 'z', situacao: 'PENDENTE', motivoDevolucao: null },
    ]);

    const r = await sincronizar();

    expect(mockApiGet).toHaveBeenCalledWith('/api/pre-cadastros/situacao?ids=x,y,z');
    expect(r).toEqual({ ...RESUMO_ZERADO, aprovados: 1, devolvidos: 1 });
    expect(mockMarcarSituacao.mock.calls).toEqual([
      ['x', 'ACEITO'],
      ['y', 'DEVOLVIDO', 'Faltou a idade.'],
    ]);
  });

  test('pergunta a situação em lotes de 100', async () => {
    mockListarPendentes.mockResolvedValue([]);
    mockListarIdsEnviados.mockResolvedValue(Array.from({ length: 150 }, (_, i) => `id${i}`));

    await sincronizar();

    expect(mockApiGet).toHaveBeenCalledTimes(2);
    expect(mockApiGet.mock.calls[0][0].split('=')[1].split(',')).toHaveLength(100);
    expect(mockApiGet.mock.calls[1][0].split('=')[1].split(',')).toHaveLength(50);
  });

  test('falha ao perguntar a situação não estraga o envio', async () => {
    mockApiPost.mockImplementation(async (_r, corpo) => ({ id: (corpo as PreCadastro).id, situacao: 'ACEITO' }));
    mockListarIdsEnviados.mockResolvedValue(['a']);
    mockApiGet.mockRejectedValue(new SemInternet());

    const r = await sincronizar();

    expect(r).toEqual({ ...RESUMO_ZERADO, enviados: 3 });
  });
});
