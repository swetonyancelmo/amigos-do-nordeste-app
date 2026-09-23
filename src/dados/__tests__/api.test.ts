import { beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('expo-network', () => ({
  getNetworkStateAsync: async () => ({ isConnected: true, isInternetReachable: null }),
}));
jest.mock('expo-constants', () => ({ expoConfig: { extra: { apiUrl: 'http://api.teste' } } }));
jest.mock('@/sessao/sessao', () => ({ lerTokenDoAparelho: async () => 'token' }));

// eslint-disable-next-line import/first
import { apiPost, ErroDaApi } from '../api';
// eslint-disable-next-line import/first
import { SemInternet } from '../sincronizar';

const fetchFalso = jest.fn<typeof fetch>();

beforeEach(() => {
  fetchFalso.mockReset();
  global.fetch = fetchFalso;
});

describe('apiPost', () => {
  test('Wi-Fi sem saída para a internet vira SemInternet', async () => {
    fetchFalso.mockRejectedValue(new TypeError('Network request failed'));
    await expect(apiPost('/x', {})).rejects.toBeInstanceOf(SemInternet);
  });

  test('tempo esgotado vira SemInternet, mesmo sem DOMException global', async () => {
    const abortado = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    fetchFalso.mockRejectedValue(abortado);
    await expect(apiPost('/x', {})).rejects.toBeInstanceOf(SemInternet);
  });

  test('resposta de erro do servidor não é confundida com falta de internet', async () => {
    fetchFalso.mockResolvedValue(new Response('proibido', { status: 403 }));
    await expect(apiPost('/x', {})).rejects.toBeInstanceOf(ErroDaApi);
  });
});
