/**
 * Idade e total da casa, sempre calculados na hora a partir das pessoas.
 *
 * Nada daqui é guardado no banco. É a mesma regra do backend: a planilha atual
 * da associação erra justamente porque alguém soma à mão e o número fica
 * velho quando a lista muda.
 *
 * Datas são strings AAAA-MM-DD comparadas por ano/mês/dia, sem passar por
 * `Date` — assim fuso horário não empurra ninguém um dia para trás.
 */
import type { Pessoa } from './tipos';

/** Idade de corte do "com até 12 anos" do rodapé. */
export const IDADE_CRIANCA = 12;

/** AAAA-MM-DD de hoje no relógio do aparelho. */
export function hojeLocal(agora: Date = new Date()): string {
  const d = (n: number) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${d(agora.getMonth() + 1)}-${d(agora.getDate())}`;
}

/** Anos completos entre duas datas AAAA-MM-DD. */
export function anosCompletos(de: string, ate: string): number {
  const [a1, m1, d1] = de.split('-').map(Number);
  const [a2, m2, d2] = ate.split('-').map(Number);
  const aindaNaoFezAniversario = m2 < m1 || (m2 === m1 && d2 < d1);
  return a2 - a1 - (aindaNaoFezAniversario ? 1 : 0);
}

/**
 * Idade da pessoa em `hoje`, ou nulo se não há como saber.
 *
 * A estimativa envelhece: "tem uns 7 anos" dito em março do ano passado é
 * 8 hoje. Por isso a estimativa sem `idadeEstimadaEm` não vale — vira nulo.
 */
export function idadeEm(p: Pessoa, hoje: string): number | null {
  let idade: number | null = null;
  if (p.dataNascimento) {
    idade = anosCompletos(p.dataNascimento, hoje);
  } else if (p.idadeEstimada !== null && p.idadeEstimadaEm) {
    idade = p.idadeEstimada + Math.max(0, anosCompletos(p.idadeEstimadaEm, hoje));
  }
  // data no futuro é erro de digitação, não bebê de idade negativa
  return idade !== null && idade >= 0 ? idade : null;
}

export type TotalDaCasa = {
  pessoas: number;
  ateDozeAnos: number;
  /** Quem não entra em nenhuma faixa por falta de data e de estimativa. */
  semIdade: number;
};

export function totalDaCasa(pessoas: readonly Pessoa[], hoje: string): TotalDaCasa {
  let ateDozeAnos = 0;
  let semIdade = 0;
  for (const p of pessoas) {
    const idade = idadeEm(p, hoje);
    if (idade === null) semIdade++;
    else if (idade <= IDADE_CRIANCA) ateDozeAnos++;
  }
  return { pessoas: pessoas.length, ateDozeAnos, semIdade };
}

/**
 * "4 pessoas · 3 com até 12 anos". Quem está sem idade aparece à parte, para
 * o número de crianças não parecer menor do que é sem ninguém perceber.
 */
export function descreverTotal(t: TotalDaCasa): string {
  const partes = [
    t.pessoas === 1 ? '1 pessoa' : `${t.pessoas} pessoas`,
    t.ateDozeAnos === 0 ? `nenhuma com até ${IDADE_CRIANCA} anos` : `${t.ateDozeAnos} com até ${IDADE_CRIANCA} anos`,
  ];
  if (t.semIdade > 0) partes.push(`${t.semIdade} sem idade`);
  return partes.join(' · ');
}

/** "Feminino · uns 7 anos" */
export function descreverPessoa(p: Pessoa, hoje: string): string {
  const partes: string[] = [];
  if (p.sexo) partes.push(p.sexo === 'F' ? 'Feminino' : 'Masculino');

  const idade = idadeEm(p, hoje);
  if (idade === null) {
    partes.push('Sem idade');
  } else {
    const anos = idade === 0 ? 'menos de 1 ano' : idade === 1 ? '1 ano' : `${idade} anos`;
    partes.push(p.dataNascimento ? anos : `uns ${anos}`);
  }
  return partes.join(' · ');
}
