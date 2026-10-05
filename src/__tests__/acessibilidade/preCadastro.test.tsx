/**
 * Acessibilidade do pré-cadastro (Passo 1 família, Passo 2 pessoas, pessoa,
 * Passo 3 revisar) e da lista "Meus cadastros", como o TalkBack vê.
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { PreCadastro } from '@/dados/tipos';
import {
  alturaMinima,
  cadastroFicticio,
  espiarAnuncios,
  foiAnunciado,
  limparRota,
  parametros,
  pessoaFicticia,
} from '../../testes/acessibilidade';

jest.mock('expo-router', () => require('../../testes/acessibilidade').moduloExpoRouter);

const mockBuscar = jest.fn<(id: string) => Promise<PreCadastro | null>>();
const mockListarTodos = jest.fn<() => Promise<PreCadastro[]>>();
jest.mock('@/dados/fila', () => ({
  buscar: (id: string) => mockBuscar(id),
  buscarRascunhoAberto: () => Promise.resolve(null),
  novoId: () => 'cadastro-novo',
  salvarRascunho: () => Promise.resolve(),
  marcarPronto: () => Promise.resolve(true),
  listarTodos: () => mockListarTodos(),
}));

const mockAtualizarComunidades = jest.fn<() => Promise<number>>();
jest.mock('@/dados/comunidades', () => ({
  listarComunidades: () =>
    Promise.resolve([{ id: 'c1', nome: 'Comunidade Exemplo', municipioNome: 'Município Exemplo' }]),
  comunidadesAtualizadasEm: () => Promise.resolve(null),
  atualizarComunidades: () => mockAtualizarComunidades(),
  mensagemFalhaAtualizar: () => 'Sem internet para atualizar a lista.',
  rotuloComunidade: (c: { nome: string }) => c.nome,
  textoAtualizadaEm: () => 'Lista ainda não atualizada.',
}));

// eslint-disable-next-line import/first
import Familia from '../../../app/cadastro/familia';
// eslint-disable-next-line import/first
import Pessoas from '../../../app/cadastro/pessoas';
// eslint-disable-next-line import/first
import PessoaDaCasa from '../../../app/cadastro/pessoa';
// eslint-disable-next-line import/first
import Revisar from '../../../app/cadastro/revisar';
// eslint-disable-next-line import/first
import Enviados from '../../../app/enviados';

beforeEach(() => {
  limparRota();
  jest.restoreAllMocks();
  mockBuscar.mockReset().mockResolvedValue(cadastroFicticio());
  mockListarTodos.mockReset();
  mockAtualizarComunidades.mockReset().mockResolvedValue(1);
});

/**
 * O contêiner de um radiogroup não é focável (senão engoliria as opções), então
 * getByRole não o acha; confere as props direto.
 */
function grupo(rotulo: string) {
  return screen.root?.queryAll(
    n => n.props.accessibilityRole === 'radiogroup' && n.props.accessibilityLabel === rotulo,
  )[0];
}

/* ------------------------------------------------------ Passo 1: família */

describe('Passo 1: a família', () => {
  test('todos os campos têm nome acessível', async () => {
    await render(<Familia />);
    await screen.findByLabelText('Nome do responsável');
    for (const r of ['Nome do responsável', 'Telefone', 'Ponto de referência']) {
      expect(screen.getByLabelText(r)).toBeOnTheScreen();
    }
  });

  test('o campo obrigatório diz que é obrigatório', async () => {
    await render(<Familia />);
    const campo = await screen.findByLabelText('Nome do responsável');
    expect(campo.props.accessibilityHint).toMatch(/Obrigatório/);
  });

  test('comunidade é um grupo de opções exclusivas com estado marcado', async () => {
    await render(<Familia />);
    await screen.findByLabelText('Nome do responsável');
    expect(grupo('Comunidade')).toBeTruthy();
    const outra = screen.getByRole('radio', { name: 'Outra comunidade' });
    expect(outra).not.toBeChecked();
    await fireEvent.press(outra);
    expect(screen.getByRole('radio', { name: 'Outra comunidade' })).toBeChecked();
    expect(screen.getByLabelText('Nome da comunidade')).toBeOnTheScreen();
  });

  test('o progresso diz "1 de 3"', async () => {
    await render(<Familia />);
    await screen.findByLabelText('Nome do responsável');
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ text: '1 de 3' });
  });

  test('o título do passo é um cabeçalho', async () => {
    await render(<Familia />);
    await screen.findByLabelText('Nome do responsável');
    expect(screen.getByRole('header', { name: 'A família' })).toBeOnTheScreen();
  });

  test('"Continuar" é botão, desabilitado sem responsável', async () => {
    await render(<Familia />);
    await screen.findByLabelText('Nome do responsável');
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Nome do responsável'), 'Fulana de Teste');
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled();
  });

  test('falha ao atualizar a lista de comunidades é anunciada', async () => {
    const anuncios = espiarAnuncios();
    mockAtualizarComunidades.mockRejectedValue(new Error('sem rede'));
    await render(<Familia />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Atualizar lista de comunidades' }));
    await screen.findByText(/Sem internet para atualizar/);
    expect(foiAnunciado(anuncios, /Sem internet para atualizar/)).toBe(true);
  });
});

/* ------------------------------------------------------- Passo 2: pessoas */

describe('Passo 2: quem mora na casa', () => {
  beforeEach(() => {
    parametros.id = 'cadastro-1';
  });

  test('cada pessoa abre por um botão com nome e detalhe', async () => {
    await render(<Pessoas />);
    expect(await screen.findByRole('button', { name: /^Fulana de Teste, / })).toBeOnTheScreen();
  });

  test('"Remover" diz quem vai ser removido', async () => {
    await render(<Pessoas />);
    expect(await screen.findByRole('button', { name: 'Remover Fulana de Teste' })).toBeOnTheScreen();
  });

  test('pessoa sem nome: o selo "falta o nome" entra no nome acessível da linha', async () => {
    mockBuscar.mockResolvedValue(
      cadastroFicticio({ pessoas: [pessoaFicticia({ nome: null, cadastroIncompleto: true })] }),
    );
    await render(<Pessoas />);
    await screen.findByRole('button', { name: 'Remover pessoa sem nome' });
    expect(screen.getByRole('button', { name: /Pessoa sem nome.*falta o nome/i })).toBeOnTheScreen();
  });

  test('o total da casa fica numa live region (muda ao remover)', async () => {
    const anuncios = espiarAnuncios();
    await render(<Pessoas />);
    await screen.findByRole('button', { name: 'Remover Fulana de Teste' });
    expect(foiAnunciado(anuncios, /1 pessoa/)).toBe(true);
  });

  test('adicionar e continuar são botões', async () => {
    await render(<Pessoas />);
    expect(await screen.findByRole('button', { name: /Adicionar mais uma pessoa/ })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled();
  });

  test('o "+" do botão de adicionar não entra no nome acessível', async () => {
    await render(<Pessoas />);
    const botao = await screen.findByRole('button', { name: /Adicionar mais uma pessoa/ });
    expect(botao.props.accessibilityLabel).not.toMatch(/\+/);
  });
});

/* ------------------------------------------------------------- uma pessoa */

describe('Pessoa da casa', () => {
  beforeEach(() => {
    parametros.id = 'cadastro-1';
  });

  test('campos, caixa de marcar e opções de sexo acessíveis', async () => {
    await render(<PessoaDaCasa />);
    expect(await screen.findByLabelText('Nome')).toBeOnTheScreen();
    expect(screen.getByLabelText('Data de nascimento')).toBeOnTheScreen();
    expect(screen.getByLabelText('Idade aproximada (anos)')).toBeOnTheScreen();
    const naoSei = screen.getByRole('checkbox', { name: 'Não sei o nome agora' });
    expect(naoSei).not.toBeChecked();
    await fireEvent.press(naoSei);
    expect(screen.getByRole('checkbox', { name: 'Não sei o nome agora' })).toBeChecked();
    expect(grupo('Sexo')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Feminino' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Masculino' })).toBeOnTheScreen();
  });

  test('data inválida: o erro vai para a dica do campo e é anunciado', async () => {
    const anuncios = espiarAnuncios();
    await render(<PessoaDaCasa />);
    await fireEvent.changeText(await screen.findByLabelText('Data de nascimento'), '31022020');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar pessoa' }));
    const campo = screen.getByLabelText('Data de nascimento');
    expect(campo.props.accessibilityHint).toMatch(/não existe/);
    expect(foiAnunciado(anuncios, /não existe/)).toBe(true);
  });

  test('opções e caixa de marcar têm alvo de pelo menos 48 dp', async () => {
    await render(<PessoaDaCasa />);
    await screen.findByLabelText('Nome');
    expect(alturaMinima(screen.getByRole('checkbox', { name: 'Não sei o nome agora' }))).toBeGreaterThanOrEqual(48);
    expect(alturaMinima(screen.getByRole('radio', { name: 'Feminino' }))).toBeGreaterThanOrEqual(48);
  });
});

/* ------------------------------------------------------ Passo 3: revisar */

describe('Passo 3: revisar e salvar', () => {
  beforeEach(() => {
    parametros.id = 'cadastro-1';
  });

  test('"Salvar cadastro" e "Corrigir dados da família" são botões', async () => {
    await render(<Revisar />);
    expect(await screen.findByRole('button', { name: 'Salvar cadastro' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Corrigir dados da família' })).toBeOnTheScreen();
  });

  test('impedimento para salvar é exposto no botão desabilitado', async () => {
    mockBuscar.mockResolvedValue(cadastroFicticio({ pessoas: [] }));
    await render(<Revisar />);
    const salvar = await screen.findByRole('button', { name: 'Salvar cadastro' });
    expect(salvar).toBeDisabled();
    expect(salvar.props.accessibilityHint ?? '').not.toBe('');
  });
});

/* ------------------------------------------------------- Meus cadastros */

describe('Meus cadastros', () => {
  test('a situação (selo) entra no nome acessível da linha', async () => {
    mockListarTodos.mockResolvedValue([cadastroFicticio({ situacao: 'DEVOLVIDO', motivoDevolucao: 'Exemplo' })]);
    await render(<Enviados />);
    expect(await screen.findByRole('button', { name: /Fulana de Teste.*devolvido/i })).toBeOnTheScreen();
  });

  test('linha sem ação (enviado) ainda expõe a situação', async () => {
    mockListarTodos.mockResolvedValue([cadastroFicticio({ situacao: 'ENVIADO' })]);
    await render(<Enviados />);
    await screen.findByText('Meus cadastros');
    expect(screen.getByText('ESPERANDO APROVAÇÃO')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ver se a associação já respondeu' })).toBeOnTheScreen();
  });
});
