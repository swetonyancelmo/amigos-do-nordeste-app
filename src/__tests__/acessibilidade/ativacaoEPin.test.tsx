/**
 * Acessibilidade da ativação por código e do PIN, como o TalkBack vê.
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  alturaMinima,
  espiarAnuncios,
  foiAnunciado,
  limparRota,
  parametros,
} from '../../testes/acessibilidade';

jest.mock('expo-router', () => require('../../testes/acessibilidade').moduloExpoRouter);

const mockApiPost = jest.fn<(rota: string, corpo: unknown) => Promise<unknown>>();
jest.mock('@/dados/api', () => ({
  ...jest.requireActual<object>('@/dados/api'),
  apiPost: (r: string, c: unknown) => mockApiPost(r, c),
}));
jest.mock('@/dados/comunidades', () => ({ atualizarComunidades: () => Promise.resolve(0) }));

const mockDestrancar = jest.fn<(pin: string) => Promise<boolean>>();
const mockDefinirPin = jest.fn<(pin: string) => Promise<void>>();
jest.mock('@/sessao/sessao', () => ({
  useSessao: () => ({
    nomeAgente: 'Agente Exemplo',
    ativar: () => Promise.resolve(),
    definirPin: (p: string) => mockDefinirPin(p),
    destrancar: (p: string) => mockDestrancar(p),
  }),
}));

// eslint-disable-next-line import/first
import Ativar from '../../../app/ativar';
// eslint-disable-next-line import/first
import Pin from '../../../app/pin';
// eslint-disable-next-line import/first
import { ErroDaApi } from '@/dados/api';

beforeEach(() => {
  limparRota();
  jest.restoreAllMocks();
  mockApiPost.mockReset();
  mockDestrancar.mockReset();
  mockDefinirPin.mockReset().mockResolvedValue(undefined);
});

/* ---------------------------------------------------------------- ativar */

describe('Ativação com código', () => {
  test('o campo do código tem nome acessível', async () => {
    await render(<Ativar />);
    expect(screen.getByLabelText('Código')).toBeOnTheScreen();
  });

  test('o título da tela é um cabeçalho', async () => {
    await render(<Ativar />);
    expect(screen.getByRole('header', { name: 'Bem-vinda!' })).toBeOnTheScreen();
  });

  test('"Continuar" é botão e fica desabilitado até ter 6 dígitos', async () => {
    await render(<Ativar />);
    const botao = screen.getByRole('button', { name: 'Continuar' });
    expect(botao).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Código'), '123456');
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled();
  });

  test('"Continuar" desabilitado diz por quê (dica acessível)', async () => {
    await render(<Ativar />);
    const botao = screen.getByRole('button', { name: 'Continuar' });
    expect(botao.props.accessibilityHint ?? '').toMatch(/6|seis|números/i);
  });

  test('código inválido é anunciado ao leitor de tela', async () => {
    const anuncios = espiarAnuncios();
    mockApiPost.mockRejectedValue(new ErroDaApi(401, '{}'));
    await render(<Ativar />);
    await fireEvent.changeText(screen.getByLabelText('Código'), '123456');
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
    // o texto está na tela, mas só visual: para o TalkBack o erro vai na dica do campo
    await screen.findByText(/Código não encontrado/, { includeHiddenElements: true });
    expect(foiAnunciado(anuncios, /Código não encontrado/)).toBe(true);
  });

  test('código inválido fica preso ao campo (dica acessível do campo)', async () => {
    mockApiPost.mockRejectedValue(new ErroDaApi(401, '{}'));
    await render(<Ativar />);
    await fireEvent.changeText(screen.getByLabelText('Código'), '123456');
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
    // o texto está na tela, mas só visual: para o TalkBack o erro vai na dica do campo
    await screen.findByText(/Código não encontrado/, { includeHiddenElements: true });
    expect(screen.getByLabelText('Código').props.accessibilityHint ?? '').toMatch(/Código não encontrado/);
  });
});

/* ------------------------------------------------------------------- PIN */

async function digitar(...teclas: string[]) {
  for (const t of teclas) await fireEvent.press(screen.getByRole('button', { name: t }));
}

describe('PIN', () => {
  test('cada tecla do teclado é um botão com nome: 0 a 9 e "Apagar"', async () => {
    await render(<Pin />);
    for (const d of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Apagar']) {
      expect(screen.getByRole('button', { name: d })).toBeOnTheScreen();
    }
  });

  test('as teclas têm alvo de toque de pelo menos 48 dp', async () => {
    await render(<Pin />);
    for (const d of ['1', '0', 'Apagar']) {
      expect(alturaMinima(screen.getByRole('button', { name: d }))).toBeGreaterThanOrEqual(48);
    }
  });

  test('anuncia quantos dígitos foram digitados ("2 de 4")', async () => {
    const anuncios = espiarAnuncios();
    await render(<Pin />);
    await digitar('7', '3');
    const porAnuncio = foiAnunciado(anuncios, /2 de 4/);
    const porValor = screen.queryAllByLabelText(/2 de 4|2 dígitos/i).length > 0;
    expect(porAnuncio || porValor).toBe(true);
  });

  test('o PIN digitado nunca aparece em texto ou rótulo acessível', async () => {
    await render(<Pin />);
    await digitar('7', '3', '9');
    // "7" só pode existir como a própria tecla
    expect(screen.getAllByText('7')).toHaveLength(1);
    expect(screen.queryAllByLabelText(/73|739/)).toHaveLength(0);
    expect(screen.queryAllByText(/73|739/)).toHaveLength(0);
  });

  test('PIN errado é anunciado', async () => {
    const anuncios = espiarAnuncios();
    mockDestrancar.mockResolvedValue(false);
    await render(<Pin />);
    await digitar('1', '2', '3', '4');
    await screen.findByText(/Não é esse número/);
    expect(foiAnunciado(anuncios, /Não é esse número/)).toBe(true);
  });

  test('ao criar, a troca para "digite os mesmos 4 números" é anunciada', async () => {
    parametros.criar = '1';
    const anuncios = espiarAnuncios();
    await render(<Pin />);
    await digitar('1', '2', '3', '4');
    await screen.findByText('Digite os mesmos 4 números');
    expect(foiAnunciado(anuncios, /mesmos 4 números/)).toBe(true);
  });

  test('ao criar, PINs diferentes são anunciados', async () => {
    parametros.criar = '1';
    const anuncios = espiarAnuncios();
    await render(<Pin />);
    await digitar('1', '2', '3', '4');
    await digitar('4', '3', '2', '1');
    await screen.findByText(/não bateram/);
    expect(foiAnunciado(anuncios, /não bateram/)).toBe(true);
  });
});
