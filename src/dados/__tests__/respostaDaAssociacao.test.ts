/**
 * A volta da resposta da associação (auditoria de integração, SYNC-01 e
 * SYNC-02), com o SQLite de verdade e um servidor falso que se comporta como
 * o real:
 *  - responde a situação só por id, com o motivo quando devolvido;
 *  - aceita de novo um DEVOLVIDO reenviado (mesmo id, conteúdo corrigido).
 *
 * O que se protege: a correção que a agente faz num devolvido chega ao
 * servidor — antes ela virava JA_RECEBIDO e sumia.
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import type { EnvioPreCadastro, SituacaoNoServidor } from '../tipos';

jest.mock('expo-sqlite', () => jest.requireActual('../../testes/sqliteEmNode'));

type NoServidor = { corpo: EnvioPreCadastro; situacao: SituacaoNoServidor['situacao']; motivo: string | null };
let mockServidor: Map<string, NoServidor>;

jest.mock('../api', () => ({
  apiPost: async (_rota: string, corpo: unknown) => {
    const c = corpo as EnvioPreCadastro;
    const atual = mockServidor.get(c.id);
    if (atual && atual.situacao !== 'DEVOLVIDO') return { id: c.id, situacao: 'JA_RECEBIDO' };
    mockServidor.set(c.id, { corpo: c, situacao: 'PENDENTE', motivo: null });
    return { id: c.id, situacao: 'ACEITO' };
  },
  apiGet: async (rota: string): Promise<SituacaoNoServidor[]> => {
    const ids = rota.split('ids=')[1].split(',');
    return ids
      .filter(id => mockServidor.has(id))
      .map(id => {
        const s = mockServidor.get(id)!;
        return { id, situacao: s.situacao, motivoDevolucao: s.situacao === 'DEVOLVIDO' ? s.motivo : null };
      });
  },
}));

// eslint-disable-next-line import/first
import { _limparParaTeste } from '../banco';
// eslint-disable-next-line import/first
import { buscar, marcarPronto, reabrirDevolvido, salvarRascunho } from '../fila';
// eslint-disable-next-line import/first
import { sincronizar } from '../sincronizar';

function familia(id: string, responsavelNome: string) {
  return {
    id,
    responsavelNome,
    telefone: null,
    comunidadeId: null,
    comunidadeNome: 'Sítio de Teste',
    pontoReferencia: null,
    pessoas: [],
  };
}

beforeEach(async () => {
  await _limparParaTeste();
  mockServidor = new Map();
});

describe('resposta da associação', () => {
  test('aprovado vira ACEITO no aparelho', async () => {
    await salvarRascunho(familia('a', 'Responsável de Teste'));
    await marcarPronto('a');
    await sincronizar();
    expect((await buscar('a'))?.situacao).toBe('ENVIADO');

    mockServidor.get('a')!.situacao = 'APROVADO';
    const r = await sincronizar();

    expect(r.aprovados).toBe(1);
    expect((await buscar('a'))?.situacao).toBe('ACEITO');
  });

  test('devolvido chega com o motivo, e a correção reenviada chega ao servidor', async () => {
    await salvarRascunho(familia('d', 'Nome Errado'));
    await marcarPronto('d');
    await sincronizar();

    // a associação devolve
    Object.assign(mockServidor.get('d')!, { situacao: 'DEVOLVIDO', motivo: 'Confira o nome da responsável.' });
    const r = await sincronizar();
    expect(r.devolvidos).toBe(1);
    expect(await buscar('d')).toMatchObject({
      situacao: 'DEVOLVIDO',
      motivoDevolucao: 'Confira o nome da responsável.',
    });

    // a agente corrige e reenvia — o mesmo id
    await salvarRascunho(familia('d', 'Nome Corrigido'), 'DEVOLVIDO');
    expect(await reabrirDevolvido('d')).toBe(true);
    const reenvio = await sincronizar();

    expect(reenvio.enviados).toBe(1);
    expect(mockServidor.get('d')).toMatchObject({ situacao: 'PENDENTE', corpo: { responsavelNome: 'Nome Corrigido' } });
    expect(await buscar('d')).toMatchObject({ situacao: 'ENVIADO', motivoDevolucao: null });
  });
});
