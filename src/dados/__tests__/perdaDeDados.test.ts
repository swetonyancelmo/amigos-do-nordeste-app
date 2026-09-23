/**
 * Os quatro jeitos de este app perder dado, cada um com um teste.
 *
 * Aqui o banco é SQLite de verdade, gravado em arquivo (ver
 * `src/testes/sqliteEmNode.ts`), e `fila.ts`, `banco.ts` e `sincronizar.ts`
 * rodam sem mock. Só a rede é falsa: um servidor que, como o de verdade, usa
 * o `id` do pré-cadastro como chave de idempotência.
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import type { EnvioPreCadastro, Pessoa, PreCadastro } from '../tipos';

jest.mock('expo-sqlite', () => jest.requireActual('../../testes/sqliteEmNode'));

const mockApiPost = jest.fn<(rota: string, corpo: unknown) => Promise<unknown>>();
jest.mock('../api', () => ({ apiPost: (...a: [string, unknown]) => mockApiPost(...a) }));

// a fila é a de verdade; só o `marcarSituacao` é espiado, para contar quantas
// vezes um cadastro foi marcado ENVIADO
jest.mock('../fila', () => {
  const real = jest.requireActual<typeof import('../fila')>('../fila');
  return { ...real, marcarSituacao: jest.fn(real.marcarSituacao) };
});

// eslint-disable-next-line import/first
import { _fecharParaTeste, _limparParaTeste } from '../banco';
// eslint-disable-next-line import/first
import { buscar, contarPendentes, listarTodos, marcarSituacao, salvarRascunho } from '../fila';
// eslint-disable-next-line import/first
import { idadeEm } from '../idade';
// eslint-disable-next-line import/first
import { SemInternet, sincronizar } from '../sincronizar';

/* ------------------------------------------------------ servidor falso */

/** O que o servidor tem gravado, por id. Uma entrada = uma família na revisão. */
let noServidor: Map<string, EnvioPreCadastro>;
/** Todo id que chegou num POST, na ordem, inclusive repetidos. */
let recebidos: string[];

/**
 * Como o servidor de verdade: se já tem o id, responde JA_RECEBIDO em vez de
 * criar outra. Cede a vez antes de responder, como a rede, para dois envios
 * ao mesmo tempo se cruzarem.
 */
async function servidor(_rota: string, corpo: unknown) {
  const c = corpo as EnvioPreCadastro;
  recebidos.push(c.id);
  await new Promise(r => setTimeout(r, 0));
  if (noServidor.has(c.id)) return { id: c.id, situacao: 'JA_RECEBIDO' };
  noServidor.set(c.id, c);
  return { id: c.id, situacao: 'ACEITO' };
}

/** Quantas vezes o cadastro `id` foi marcado ENVIADO no aparelho. */
function vezesMarcadoEnviado(id: string): number {
  return jest
    .mocked(marcarSituacao)
    .mock.calls.filter(([i, s]) => i === id && s === 'ENVIADO').length;
}

/* ------------------------------------------------------------- dados */

function pessoa(p: Partial<Pessoa> & Pick<Pessoa, 'id' | 'ordem'>): Pessoa {
  return {
    nome: null,
    cadastroIncompleto: false,
    sexo: null,
    dataNascimento: null,
    idadeEstimada: null,
    idadeEstimadaEm: null,
    ...p,
  };
}

/** Uma família inventada, com os casos difíceis: sem nome, sem data, acento. */
function familia(id: string) {
  return {
    id,
    responsavelNome: 'Maria José da Conceição',
    telefone: '(84) 99999-0000',
    comunidadeId: 'com-1',
    comunidadeNome: 'Sítio Açude Velho',
    pontoReferencia: 'Depois da igreja, casa azul à esquerda',
    pessoas: [
      pessoa({ id: `${id}-p1`, ordem: 0, nome: 'Maria José da Conceição', sexo: 'F', dataNascimento: '1988-03-15' }),
      pessoa({ id: `${id}-p2`, ordem: 1, sexo: 'M', idadeEstimada: 4, idadeEstimadaEm: '2026-09-01' }),
      pessoa({ id: `${id}-p3`, ordem: 2, nome: null, cadastroIncompleto: true }),
    ],
  };
}

/** Tudo do registro menos o que muda com a situação. */
function conteudo(p: PreCadastro | null) {
  if (!p) throw new Error('cadastro sumiu do aparelho');
  const { situacao, atualizadoEm, enviadoEm, motivoDevolucao, ...resto } = p;
  return resto;
}

beforeEach(async () => {
  await _limparParaTeste();
  noServidor = new Map();
  recebidos = [];
  mockApiPost.mockReset().mockImplementation(servidor);
  jest.mocked(marcarSituacao).mockClear();
});

/* ------------------------------------------------------------ 1 */

describe('1. rascunho salvo sobrevive a fechar o app', () => {
  test('salvar, reabrir o banco e voltar igual', async () => {
    const entrada = familia('rascunho-1');
    await salvarRascunho(entrada);
    const antes = await buscar('rascunho-1');

    await _fecharParaTeste();
    const depois = await buscar('rascunho-1');

    expect(depois).toEqual(antes);
    expect(depois).toMatchObject({ ...entrada, situacao: 'RASCUNHO' });
    // os casos difíceis voltam como foram: pessoa sem nome e estimativa com data
    expect(depois?.pessoas[1]).toMatchObject({ idadeEstimada: 4, idadeEstimadaEm: '2026-09-01' });
    expect(depois?.pessoas[2]).toMatchObject({ nome: null, cadastroIncompleto: true });
  });

  test('salvar de novo sobrescreve, sem duplicar a família nem as pessoas', async () => {
    const entrada = familia('rascunho-1');
    await salvarRascunho(entrada);
    await salvarRascunho({ ...entrada, pontoReferencia: 'Casa amarela', pessoas: entrada.pessoas.slice(0, 2) });

    await _fecharParaTeste();
    const todos = await listarTodos();

    expect(todos).toHaveLength(1);
    expect(todos[0].pontoReferencia).toBe('Casa amarela');
    expect(todos[0].pessoas.map(p => p.id)).toEqual(['rascunho-1-p1', 'rascunho-1-p2']);
  });
});

/* ------------------------------------------------------------ 2 */

describe('2. enviar o mesmo pré-cadastro duas vezes: uma família só', () => {
  test('servidor gravou mas a resposta não voltou: o reenvio vira JA_RECEBIDO', async () => {
    await salvarRascunho(familia('a'), 'PRONTO');

    // o servidor grava, e a internet cai antes de a resposta chegar
    mockApiPost.mockImplementationOnce(async (rota, corpo) => {
      await servidor(rota, corpo);
      throw new SemInternet();
    });
    const primeira = await sincronizar();

    // para o aparelho não foi: continua na fila
    expect(primeira.semInternet).toBe(true);
    expect((await buscar('a'))?.situacao).toBe('PRONTO');

    const segunda = await sincronizar();

    expect(segunda).toEqual({ enviados: 0, jaRecebidos: 1, comErro: 0, semInternet: false });
    // o mesmo id nas duas tentativas, e é o id que nasceu no aparelho
    expect(recebidos).toEqual(['a', 'a']);
    expect([...noServidor.keys()]).toEqual(['a']);
    expect((await buscar('a'))?.situacao).toBe('ENVIADO');
    expect(vezesMarcadoEnviado('a')).toBe(1);
  });

  test('tocar "enviar" de novo depois de enviado não manda nem remarca', async () => {
    await salvarRascunho(familia('a'), 'PRONTO');
    await sincronizar();
    const enviado = await buscar('a');

    const segunda = await sincronizar();

    expect(segunda).toEqual({ enviados: 0, jaRecebidos: 0, comErro: 0, semInternet: false });
    expect(recebidos).toEqual(['a']);
    expect(await buscar('a')).toEqual(enviado);
    expect(vezesMarcadoEnviado('a')).toBe(1);
  });

  test('dois envios ao mesmo tempo (dois toques rápidos em "Enviar agora")', async () => {
    await salvarRascunho(familia('a'), 'PRONTO');
    await salvarRascunho(familia('b'), 'PRONTO');

    await Promise.all([sincronizar(), sincronizar()]);

    // cada cadastro sai do aparelho uma vez só
    expect([...recebidos].sort()).toEqual(['a', 'b']);
    expect([...noServidor.keys()].sort()).toEqual(['a', 'b']);
    expect((await listarTodos()).map(p => p.situacao)).toEqual(['ENVIADO', 'ENVIADO']);
    expect(vezesMarcadoEnviado('a')).toBe(1);
    expect(vezesMarcadoEnviado('b')).toBe(1);
  });
});

/* ------------------------------------------------------------ 3 */

describe('3. sem internet no meio do lote', () => {
  test('o resto fica na fila, inteiro, e sai quando a internet volta', async () => {
    const entradas = ['a', 'b', 'c'].map(familia);
    for (const e of entradas) await salvarRascunho(e, 'PRONTO');
    const antes = await listarTodos();

    // o primeiro vai; no segundo o sinal cai antes de chegar ao servidor
    mockApiPost
      .mockImplementationOnce(servidor)
      .mockImplementationOnce(async () => {
        throw new SemInternet();
      });
    const r = await sincronizar();

    expect(r).toEqual({ enviados: 1, jaRecebidos: 0, comErro: 0, semInternet: true });
    // nem tentou o terceiro
    expect(mockApiPost).toHaveBeenCalledTimes(2);

    // e a agente fecha o app sem sinal
    await _fecharParaTeste();
    const depois = await listarTodos();

    // nada sumiu, nada mudou de conteúdo
    expect(depois).toHaveLength(3);
    for (const p of antes) {
      expect(conteudo(depois.find(d => d.id === p.id) ?? null)).toEqual(conteudo(p));
    }
    // só o que o servidor confirmou saiu da fila
    const [foi] = [...noServidor.keys()];
    expect(depois.filter(p => p.situacao === 'ENVIADO').map(p => p.id)).toEqual([foi]);
    expect(depois.filter(p => p.situacao === 'PRONTO')).toHaveLength(2);
    expect(await contarPendentes()).toBe(2);

    // a internet volta
    const r2 = await sincronizar();

    expect(r2).toEqual({ enviados: 2, jaRecebidos: 0, comErro: 0, semInternet: false });
    expect([...noServidor.keys()].sort()).toEqual(['a', 'b', 'c']);
    expect(await contarPendentes()).toBe(0);
    // o que chegou ao servidor é o que a agente digitou
    for (const e of entradas) expect(noServidor.get(e.id)).toMatchObject(e);
  });
});

/* ------------------------------------------------------------ 4 */

describe('4. idade estimada envelhece', () => {
  const estimada = pessoa({ id: 'x', ordem: 0, idadeEstimada: 4, idadeEstimadaEm: '2024-09-23' });

  test('4 anos estimados há 2 anos vira 6', () => {
    expect(idadeEm(estimada, '2026-09-23')).toBe(6);
    // na véspera de fazer 2 anos da estimativa, ainda 5
    expect(idadeEm(estimada, '2026-09-22')).toBe(5);
  });

  test('a data da estimativa sobrevive ao banco, senão a idade não envelhece', async () => {
    await salvarRascunho({ ...familia('a'), pessoas: [estimada] });
    await _fecharParaTeste();

    const [p] = (await buscar('a'))!.pessoas;

    expect(idadeEm(p, '2026-09-23')).toBe(6);
  });
});
