/**
 * Acessibilidade do envio da fila: botão de enviar, progresso, sucesso,
 * falha, sem internet e sem acesso, como o TalkBack vê.
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { act, render, screen } from '@testing-library/react-native';
import type { ResumoSincronizacao } from '@/dados/sincronizar';
import { espiarAnuncios, foiAnunciado, limparRota, roteador } from '../../testes/acessibilidade';

jest.mock('expo-router', () => require('../../testes/acessibilidade').moduloExpoRouter);

const mockContarPendentes = jest.fn<() => Promise<number>>();
jest.mock('@/dados/fila', () => ({ contarPendentes: () => mockContarPendentes() }));

type AoProgredir = (feitos: number, total: number) => void;
const mockSincronizar = jest.fn<(p?: AoProgredir) => Promise<ResumoSincronizacao>>();
jest.mock('@/dados/sincronizar', () => ({ sincronizar: (p?: AoProgredir) => mockSincronizar(p) }));

jest.mock('@/sessao/sessao', () => ({
  useSessao: () => ({ nomeAgente: 'Agente Exemplo', desativar: () => Promise.resolve() }),
}));

// eslint-disable-next-line import/first
import Inicio from '../../../app/inicio';
// eslint-disable-next-line import/first
import Enviando from '../../../app/enviando';
// eslint-disable-next-line import/first
import SemInternet from '../../../app/sem-internet';
// eslint-disable-next-line import/first
import SemAcesso from '../../../app/sem-acesso';

const RESUMO: ResumoSincronizacao = {
  enviados: 0,
  jaRecebidos: 0,
  comErro: 0,
  semInternet: false,
  semAcesso: false,
  recusados: 0,
  aprovados: 0,
  devolvidos: 0,
};

beforeEach(() => {
  limparRota();
  jest.restoreAllMocks();
  mockContarPendentes.mockReset().mockResolvedValue(3);
  mockSincronizar.mockReset();
});

describe('Tela inicial', () => {
  test('"Enviar agora", "Cadastrar uma família" e "Meus cadastros" são botões com nome', async () => {
    await render(<Inicio />);
    expect(await screen.findByRole('button', { name: 'Enviar agora' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cadastrar uma família' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Meus cadastros/ })).toBeOnTheScreen();
  });

  test('o contador da fila é lido como uma frase só ("3 cadastros esperando envio")', async () => {
    await render(<Inicio />);
    await screen.findByRole('button', { name: 'Enviar agora' });
    expect(screen.getByLabelText(/3 cadastros esperando envio/)).toBeOnTheScreen();
  });
});

describe('Enviando', () => {
  test('o início do envio é anunciado', async () => {
    const anuncios = espiarAnuncios();
    mockSincronizar.mockReturnValue(new Promise(() => undefined));
    await render(<Enviando />);
    await screen.findByText('0 de 3 enviados');
    expect(foiAnunciado(anuncios, /Enviando cadastros/)).toBe(true);
  });

  test('o progresso fica numa live region e numa barra com valor', async () => {
    const anuncios = espiarAnuncios();
    let progredir: AoProgredir = () => undefined;
    mockSincronizar.mockImplementation(p => {
      progredir = p ?? progredir;
      return new Promise(() => undefined);
    });
    await render(<Enviando />);
    await screen.findByText('0 de 3 enviados');
    await act(async () => progredir(2, 3));
    expect(foiAnunciado(anuncios, /2 de 3 enviados/)).toBe(true);
    expect(screen.getByRole('progressbar', { name: '2 de 3 enviados' })).toBeOnTheScreen();
  });

  test('sucesso é anunciado', async () => {
    const anuncios = espiarAnuncios();
    mockSincronizar.mockResolvedValue({ ...RESUMO, enviados: 3 });
    await render(<Enviando />);
    await screen.findByText('3 cadastros enviados');
    expect(foiAnunciado(anuncios, /3 cadastros enviados/)).toBe(true);
    expect(screen.getByRole('button', { name: 'Voltar ao início' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ver meus cadastros' })).toBeOnTheScreen();
  });

  test('falha parcial é anunciada', async () => {
    const anuncios = espiarAnuncios();
    mockSincronizar.mockResolvedValue({ ...RESUMO, enviados: 2, comErro: 1 });
    await render(<Enviando />);
    await screen.findByText('1 cadastro não foi desta vez');
    expect(foiAnunciado(anuncios, /não foi desta vez/)).toBe(true);
  });

  test('falha inesperada é anunciada', async () => {
    const anuncios = espiarAnuncios();
    mockSincronizar.mockRejectedValue(new Error('qualquer'));
    await render(<Enviando />);
    await screen.findByText('Não deu para enviar agora');
    expect(foiAnunciado(anuncios, /Não deu para enviar agora/)).toBe(true);
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
  });

  test('sem internet leva à tela própria', async () => {
    mockSincronizar.mockResolvedValue({ ...RESUMO, semInternet: true });
    await render(<Enviando />);
    await screen.findByText('Enviando cadastros');
    await new Promise(r => setTimeout(r, 0));
    expect(roteador.replace).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/sem-internet' }));
  });
});

describe('Sem internet', () => {
  test('o estado "sem internet" é anunciado ao abrir a tela', async () => {
    const anuncios = espiarAnuncios();
    await render(<SemInternet />);
    await screen.findByText(/continuam guardados/);
    expect(foiAnunciado(anuncios, /Sem internet/)).toBe(true);
  });

  test('"Tentar de novo" e "Voltar ao início" são botões', async () => {
    await render(<SemInternet />);
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Voltar ao início' })).toBeOnTheScreen();
  });

  test('o título é um cabeçalho', async () => {
    await render(<SemInternet />);
    expect(screen.getByRole('header', { name: 'Sem internet agora' })).toBeOnTheScreen();
  });
});

describe('Sem acesso', () => {
  test('o estado é anunciado e as saídas são botões', async () => {
    const anuncios = espiarAnuncios();
    await render(<SemAcesso />);
    await screen.findByText(/continuam guardados/);
    expect(screen.getByRole('button', { name: 'Ativar com código novo' })).toBeOnTheScreen();
    expect(foiAnunciado(anuncios, /perdeu o acesso/)).toBe(true);
  });
});
