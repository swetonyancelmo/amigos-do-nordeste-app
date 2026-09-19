import { describe, expect, test } from '@jest/globals';
import {
  FORM_VAZIO,
  formVazio,
  lerData,
  mascararData,
  paraForm,
  validarPessoa,
  type FormPessoa,
  type Validacao,
} from '../formPessoa';
import type { Pessoa } from '../tipos';

const HOJE = '2026-09-19';

const form = (f: Partial<FormPessoa>): FormPessoa => ({ ...FORM_VAZIO, ...f });

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

function dados(v: Validacao) {
  if (!v.ok) throw new Error(`esperava válido, veio ${JSON.stringify(v.erros)}`);
  return v.dados;
}

function erros(v: Validacao) {
  if (v.ok) throw new Error('esperava erro, veio válido');
  return v.erros;
}

describe('nome', () => {
  test('pessoa sem nome pode ser salva, marcada incompleta', () => {
    const d = dados(validarPessoa(form({ naoSeiNome: true, idadeAproximada: '7' }), HOJE));
    expect(d.nome).toBeNull();
    expect(d.cadastroIncompleto).toBe(true);
  });

  test('nome em branco nunca trava: salva e marca incompleta mesmo sem a caixa', () => {
    const d = dados(validarPessoa(form({ sexo: 'F' }), HOJE));
    expect(d.nome).toBeNull();
    expect(d.cadastroIncompleto).toBe(true);
  });

  test('"não sei o nome" com apelido guarda o apelido e continua incompleta', () => {
    const d = dados(validarPessoa(form({ nome: '  filha da Maria ', naoSeiNome: true }), HOJE));
    expect(d.nome).toBe('filha da Maria');
    expect(d.cadastroIncompleto).toBe(true);
  });

  test('com nome e sem a caixa, o cadastro está completo', () => {
    expect(dados(validarPessoa(form({ nome: 'Ana' }), HOJE)).cadastroIncompleto).toBe(false);
  });
});

describe('idade aproximada', () => {
  test('grava a idade e a data de hoje em idadeEstimadaEm', () => {
    const d = dados(validarPessoa(form({ idadeAproximada: '7' }), HOJE));
    expect(d.idadeEstimada).toBe(7);
    expect(d.idadeEstimadaEm).toBe(HOJE);
    expect(d.dataNascimento).toBeNull();
  });

  test('bebê de menos de 1 ano é idade 0, não campo vazio', () => {
    expect(dados(validarPessoa(form({ idadeAproximada: '0' }), HOJE)).idadeEstimada).toBe(0);
  });

  test('sem data e sem idade, as duas ficam nulas juntas', () => {
    const d = dados(validarPessoa(form({ nome: 'Ana' }), HOJE));
    expect(d.idadeEstimada).toBeNull();
    expect(d.idadeEstimadaEm).toBeNull();
  });

  test('editar outra coisa não troca a data da estimativa por hoje', () => {
    const antes = pessoa({ nome: 'Ana', idadeEstimada: 7, idadeEstimadaEm: '2025-03-01' });
    const f = paraForm(antes, HOJE);
    expect(f.idadeAproximada).toBe('8'); // já envelhecida

    const d = dados(validarPessoa({ ...f, nome: 'Ana Paula' }, HOJE, antes));
    expect(d.idadeEstimada).toBe(7);
    expect(d.idadeEstimadaEm).toBe('2025-03-01');
  });

  test('mudar a idade faz uma estimativa nova, com a data de hoje', () => {
    const antes = pessoa({ idadeEstimada: 7, idadeEstimadaEm: '2025-03-01' });
    const d = dados(validarPessoa({ ...paraForm(antes, HOJE), idadeAproximada: '10' }, HOJE, antes));
    expect(d.idadeEstimada).toBe(10);
    expect(d.idadeEstimadaEm).toBe(HOJE);
  });

  test('idade que não é número inteiro é recusada', () => {
    expect(erros(validarPessoa(form({ idadeAproximada: '7,5' }), HOJE)).idadeAproximada).toBeDefined();
    expect(erros(validarPessoa(form({ idadeAproximada: '200' }), HOJE)).idadeAproximada).toBeDefined();
  });
});

describe('data de nascimento', () => {
  test('nunca é obrigatória', () => {
    expect(validarPessoa(form({}), HOJE).ok).toBe(true);
  });

  test('é gravada como AAAA-MM-DD e sem estimativa', () => {
    const d = dados(validarPessoa(form({ dataNascimento: '12/03/2019' }), HOJE));
    expect(d.dataNascimento).toBe('2019-03-12');
    expect(d.idadeEstimada).toBeNull();
    expect(d.idadeEstimadaEm).toBeNull();
  });

  test('hoje vale; amanhã é recusada', () => {
    expect(validarPessoa(form({ dataNascimento: '19/09/2026' }), HOJE).ok).toBe(true);
    expect(erros(validarPessoa(form({ dataNascimento: '20/09/2026' }), HOJE)).dataNascimento).toMatch(
      /futuro/,
    );
  });

  test('data que não existe, incompleta ou antiga demais é recusada', () => {
    for (const t of ['31/02/2020', '12/13/2020', '12/03/20', '01/01/1880']) {
      expect(erros(validarPessoa(form({ dataNascimento: t }), HOJE)).dataNascimento).toBeDefined();
    }
  });

  test('o limite de idade conta a data inteira, não só o ano', () => {
    expect(validarPessoa(form({ dataNascimento: '31/12/1895' }), HOJE).ok).toBe(true); // 130
    expect(validarPessoa(form({ dataNascimento: '20/09/1895' }), HOJE).ok).toBe(true); // 130
    expect(erros(validarPessoa(form({ dataNascimento: '19/09/1895' }), HOJE)).dataNascimento).toBeDefined(); // 131
  });

  test('não dá para salvar com data de nascimento e idade aproximada juntas', () => {
    const e = erros(validarPessoa(form({ dataNascimento: '12/03/2019', idadeAproximada: '7' }), HOJE));
    expect(e.idadeAproximada).toMatch(/só um/);
  });

  test('trocar a estimativa por uma data certa apaga a estimativa', () => {
    const antes = pessoa({ idadeEstimada: 7, idadeEstimadaEm: '2025-03-01' });
    const f = { ...paraForm(antes, HOJE), idadeAproximada: '', dataNascimento: '12/03/2018' };
    const d = dados(validarPessoa(f, HOJE, antes));
    expect(d.dataNascimento).toBe('2018-03-12');
    expect(d.idadeEstimada).toBeNull();
    expect(d.idadeEstimadaEm).toBeNull();
  });
});

test('máscara põe as barras enquanto digita', () => {
  expect(mascararData('12')).toBe('12');
  expect(mascararData('1203')).toBe('12/03');
  expect(mascararData('12032019')).toBe('12/03/2019');
  expect(mascararData('12/03/20195')).toBe('12/03/2019');
});

test('29 de fevereiro só em ano bissexto', () => {
  expect(lerData('29/02/2024')).toBe('2024-02-29');
  expect(lerData('29/02/2023')).toBeNull();
});

test('paraForm devolve o que foi gravado', () => {
  expect(paraForm(pessoa({ nome: 'Ana', sexo: 'F', dataNascimento: '2019-03-12' }), HOJE)).toEqual({
    nome: 'Ana',
    naoSeiNome: false,
    sexo: 'F',
    dataNascimento: '12/03/2019',
    idadeAproximada: '',
  });
  expect(paraForm(pessoa({ cadastroIncompleto: true }), HOJE).naoSeiNome).toBe(true);
});

test('formVazio só para o formulário intocado', () => {
  expect(formVazio(FORM_VAZIO)).toBe(true);
  expect(formVazio(form({ naoSeiNome: true }))).toBe(false);
});
