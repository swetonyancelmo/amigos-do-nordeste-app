import { describe, expect, jest, test } from '@jest/globals';

jest.mock('expo-constants', () => ({ expoConfig: { extra: { apiUrl: 'http://api.teste' } } }));
jest.mock('expo-network', () => ({}));
jest.mock('@/sessao/sessao', () => ({ lerTokenDoAparelho: async () => null }));

// eslint-disable-next-line import/first
import { ErroDaApi } from '../api';
// eslint-disable-next-line import/first
import { mensagemFalhaAtivacao } from '../ativacao';
// eslint-disable-next-line import/first
import { SemInternet } from '../sincronizar';

describe('mensagemFalhaAtivacao', () => {
  test('sem internet pede sinal', () => {
    expect(mensagemFalhaAtivacao(new SemInternet())).toMatch(/internet/);
  });

  test('401 é código errado ou já usado', () => {
    expect(mensagemFalhaAtivacao(new ErroDaApi(401, '{}'))).toMatch(/Código não encontrado/);
  });

  test('429 pede para esperar, não para conferir o código', () => {
    const texto = mensagemFalhaAtivacao(new ErroDaApi(429, '{}'));
    expect(texto).toMatch(/Espere um minuto/);
    expect(texto).not.toMatch(/Código não encontrado/);
  });

  test('erro do servidor não culpa o código', () => {
    expect(mensagemFalhaAtivacao(new ErroDaApi(500, '{}'))).toMatch(/Não deu para ativar agora/);
    expect(mensagemFalhaAtivacao(new Error('qualquer'))).toMatch(/Não deu para ativar agora/);
  });
});
