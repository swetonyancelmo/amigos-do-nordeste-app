import { describe, expect, test } from '@jest/globals';
import { motivoParaMostrar, podeCorrigir, SEM_MOTIVO } from '../devolvido';

describe('motivoParaMostrar', () => {
  test('mostra o que a associação escreveu, na íntegra', () => {
    const motivo =
      'Falta o telefone.\nO nome da criança mais nova está só "bebê" — perguntar à mãe.  ';
    expect(motivoParaMostrar({ motivoDevolucao: motivo })).toBe(motivo);
  });

  test('texto longo não é cortado', () => {
    const motivo = 'Conferir o ponto de referência. '.repeat(40);
    expect(motivoParaMostrar({ motivoDevolucao: motivo })).toBe(motivo);
  });

  test.each([null, '', '   \n '])('motivo em branco (%j) vira a frase padrão', m => {
    expect(motivoParaMostrar({ motivoDevolucao: m })).toBe(SEM_MOTIVO);
  });
});

describe('podeCorrigir', () => {
  test('só o devolvido volta para a fila por aqui', () => {
    expect(podeCorrigir({ situacao: 'DEVOLVIDO' })).toBe(true);
    for (const s of ['RASCUNHO', 'PRONTO', 'ENVIADO', 'ACEITO'] as const) {
      expect(podeCorrigir({ situacao: s })).toBe(false);
    }
  });
});
