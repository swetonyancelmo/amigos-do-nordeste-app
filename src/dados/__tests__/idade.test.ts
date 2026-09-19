import { expect, test } from '@jest/globals';
import { descreverTotal, hojeLocal, idadeEm, totalDaCasa } from '../idade';
import type { Pessoa } from '../tipos';

const HOJE = '2026-09-19';

function pessoa(p: Partial<Pessoa>): Pessoa {
  return {
    id: 'x',
    nome: null,
    cadastroIncompleto: false,
    sexo: null,
    dataNascimento: null,
    idadeEstimada: null,
    idadeEstimadaEm: null,
    ordem: 0,
    ...p,
  };
}

test('idade pela data de nascimento conta o aniversário deste ano', () => {
  expect(idadeEm(pessoa({ dataNascimento: '2014-09-19' }), HOJE)).toBe(12);
  expect(idadeEm(pessoa({ dataNascimento: '2013-09-20' }), HOJE)).toBe(12);
  expect(idadeEm(pessoa({ dataNascimento: '2013-09-19' }), HOJE)).toBe(13);
});

test('idade estimada envelhece desde o dia em que foi estimada', () => {
  const p = pessoa({ idadeEstimada: 12, idadeEstimadaEm: '2025-03-01' });
  expect(idadeEm(p, '2026-02-28')).toBe(12);
  expect(idadeEm(p, HOJE)).toBe(13);
});

test('estimativa sem data de referência não vale', () => {
  expect(idadeEm(pessoa({ idadeEstimada: 7 }), HOJE)).toBeNull();
});

test('nascimento no futuro não vira idade negativa', () => {
  expect(idadeEm(pessoa({ dataNascimento: '2027-01-01' }), HOJE)).toBeNull();
});

test('total confere com a lista', () => {
  const casa = [
    pessoa({ dataNascimento: '1990-05-10' }),
    pessoa({ dataNascimento: '2020-01-01' }),
    pessoa({ idadeEstimada: 3, idadeEstimadaEm: '2026-01-10' }),
    pessoa({ dataNascimento: '2014-09-19' }),
  ];
  const t = totalDaCasa(casa, HOJE);
  expect(t).toEqual({ pessoas: 4, ateDozeAnos: 3, semIdade: 0 });
  expect(descreverTotal(t)).toBe('4 pessoas · 3 com até 12 anos');

  // remover alguém muda o total, porque nada fica guardado
  expect(descreverTotal(totalDaCasa(casa.slice(1), HOJE))).toBe('3 pessoas · 3 com até 12 anos');
});

test('quem está sem idade aparece à parte', () => {
  const t = totalDaCasa([pessoa({}), pessoa({ dataNascimento: '1980-01-01' })], HOJE);
  expect(descreverTotal(t)).toBe('2 pessoas · nenhuma com até 12 anos · 1 sem idade');
  expect(descreverTotal(totalDaCasa([pessoa({ dataNascimento: '2020-01-01' })], HOJE))).toBe(
    '1 pessoa · 1 com até 12 anos',
  );
});

test('hoje é a data do relógio local, não a de UTC', () => {
  expect(hojeLocal(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
});
