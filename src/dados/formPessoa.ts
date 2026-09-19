/**
 * O formulário de uma pessoa (tela `cadastro/pessoa`), separado da tela para
 * poder ser testado sem React.
 *
 * É aqui que mora a regra que mais estraga relatório em silêncio: sem data de
 * nascimento, a idade aproximada é gravada junto com o dia em que foi dita
 * (`idadeEstimadaEm`). É isso que deixa o sistema envelhecer a estimativa
 * sozinho — "uns 7 anos" dito no ano passado é 8 hoje.
 *
 * O que este formulário nunca faz:
 * - exigir data de nascimento: a maior parte dos papéis chega sem ela;
 * - exigir nome: "filha de Jane" é cadastro de verdade, marcado incompleto.
 */
import { anosCompletos, idadeEm } from './idade';
import type { Pessoa, Sexo } from './tipos';

/** Acima disso é erro de digitação, não pessoa. */
export const IDADE_MAXIMA = 130;

/** O que está na tela, do jeito que foi digitado. */
export type FormPessoa = {
  nome: string;
  naoSeiNome: boolean;
  sexo: Sexo | null;
  /** DD/MM/AAAA, como a agente digita. */
  dataNascimento: string;
  /** Anos, em texto. */
  idadeAproximada: string;
};

export const FORM_VAZIO: FormPessoa = {
  nome: '',
  naoSeiNome: false,
  sexo: null,
  dataNascimento: '',
  idadeAproximada: '',
};

export type ErrosPessoa = {
  dataNascimento?: string;
  idadeAproximada?: string;
};

/** O que vai para o banco. `id` e `ordem` são de quem chama. */
export type DadosPessoa = Omit<Pessoa, 'id' | 'ordem'>;

export type Validacao = { ok: true; dados: DadosPessoa } | { ok: false; erros: ErrosPessoa };

const soDigitos = (t: string) => t.replace(/\D/g, '');

/* ------------------------------------------------------------------ datas */

/** Põe as barras enquanto a agente digita: "1203201" → "12/03/201". */
export function mascararData(t: string): string {
  const d = soDigitos(t).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Os 8 dígitos já foram digitados — dá para dizer se a data vale. */
export function dataCompleta(t: string): boolean {
  return soDigitos(t).length === 8;
}

function diasNoMes(ano: number, mes: number): number {
  if (mes === 2) return ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0) ? 29 : 28;
  return [4, 6, 9, 11].includes(mes) ? 30 : 31;
}

/** DD/MM/AAAA → AAAA-MM-DD, ou nulo se incompleta ou se o dia não existe. */
export function lerData(t: string): string | null {
  const d = soDigitos(t);
  if (d.length !== 8) return null;
  const dia = Number(d.slice(0, 2));
  const mes = Number(d.slice(2, 4));
  const ano = Number(d.slice(4));
  if (mes < 1 || mes > 12 || dia < 1 || dia > diasNoMes(ano, mes)) return null;
  return `${d.slice(4)}-${d.slice(2, 4)}-${d.slice(0, 2)}`;
}

/** AAAA-MM-DD → DD/MM/AAAA. */
export function formatarData(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

/* -------------------------------------------------------------- conversão */

/**
 * O formulário a partir do que está gravado. A idade aproximada aparece já
 * envelhecida até hoje — mostrar o "7" dito no ano passado confundiria.
 */
export function paraForm(p: Pessoa, hoje: string): FormPessoa {
  const idade = p.dataNascimento ? null : idadeEm(p, hoje);
  return {
    nome: p.nome ?? '',
    naoSeiNome: p.cadastroIncompleto,
    sexo: p.sexo,
    dataNascimento: p.dataNascimento ? formatarData(p.dataNascimento) : '',
    idadeAproximada: idade === null ? '' : String(idade),
  };
}

export function formVazio(f: FormPessoa): boolean {
  return (
    f.nome.trim() === '' &&
    !f.naoSeiNome &&
    f.sexo === null &&
    f.dataNascimento.trim() === '' &&
    f.idadeAproximada.trim() === ''
  );
}

/**
 * Valida e converte para o que vai ao banco.
 *
 * `anterior` é a pessoa como está gravada, quando é uma edição. Se a idade
 * aproximada não mudou, a estimativa original é mantida com a data em que foi
 * feita: corrigir o nome um ano depois não pode "rejuvenescer" ninguém
 * trocando a data de referência por hoje.
 */
export function validarPessoa(f: FormPessoa, hoje: string, anterior: Pessoa | null = null): Validacao {
  const erros: ErrosPessoa = {};

  const textoData = f.dataNascimento.trim();
  const textoIdade = f.idadeAproximada.trim();

  let dataNascimento: string | null = null;
  if (textoData !== '') {
    dataNascimento = lerData(textoData);
    if (!dataCompleta(textoData)) {
      erros.dataNascimento = 'Data incompleta. Use dia, mês e ano: 12/03/2019.';
    } else if (dataNascimento === null) {
      erros.dataNascimento = 'Essa data não existe. Confira o dia e o mês.';
    } else if (dataNascimento > hoje) {
      erros.dataNascimento = 'A data está no futuro. Confira o ano.';
    } else if (anosCompletos(dataNascimento, hoje) > IDADE_MAXIMA) {
      // pela data inteira, não só pelo ano: quem faz 131 em dezembro ainda tem 130
      erros.dataNascimento = 'Ano muito antigo. Confira o ano.';
    }
  }

  let idade: number | null = null;
  if (textoIdade !== '') {
    idade = /^\d+$/.test(textoIdade) ? Number(textoIdade) : null;
    if (idade === null) {
      erros.idadeAproximada = 'Digite só a idade em anos, com números.';
    } else if (idade > IDADE_MAXIMA) {
      erros.idadeAproximada = 'Idade alta demais. Confira o número.';
    }
  }

  // Um ou outro, nunca os dois: com os dois não dá para saber qual vale.
  if (textoData !== '' && textoIdade !== '') {
    erros.idadeAproximada =
      'Preencha só um: a data de nascimento ou a idade aproximada. Apague o que não vale.';
  }

  if (erros.dataNascimento || erros.idadeAproximada) return { ok: false, erros };

  const nome = f.nome.trim() === '' ? null : f.nome.trim();

  let idadeEstimada: number | null = null;
  let idadeEstimadaEm: string | null = null;
  if (idade !== null) {
    const idadeAnterior = anterior && !anterior.dataNascimento ? idadeEm(anterior, hoje) : null;
    if (anterior && idadeAnterior === idade) {
      idadeEstimada = anterior.idadeEstimada;
      idadeEstimadaEm = anterior.idadeEstimadaEm;
    } else {
      idadeEstimada = idade;
      idadeEstimadaEm = hoje;
    }
  }

  return {
    ok: true,
    dados: {
      nome,
      // sem nome também é incompleto: nunca trava a digitação, mas a
      // associação precisa ver que falta
      cadastroIncompleto: f.naoSeiNome || nome === null,
      sexo: f.sexo,
      dataNascimento,
      idadeEstimada,
      idadeEstimadaEm,
    },
  };
}
