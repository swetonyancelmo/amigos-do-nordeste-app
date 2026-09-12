/**
 * Tokens de design do app da agente de saúde.
 *
 * As medidas aqui são maiores que o padrão de app de propósito. Quem usa está
 * em pé, no sol, com uma mão, e pode ser interrompida no meio. Alvo de toque
 * nunca abaixo de 56 px, corpo de texto nunca abaixo de 16.
 */

export const cores = {
  laranja: '#E54314',
  ambar: '#F49924',
  verde: '#119037',
  amarelo: '#FFC728',

  papel: '#FAF6F1',
  branco: '#FFFFFF',
  tinta: '#1F1B18',
  apagado: '#6B6259',
  linha: '#E6DCD2',

  laranjaSuave: '#FCEBE3',
  verdeSuave: '#E4F1E7',
  ambarSuave: '#FEF3E0',
} as const;

/** Escala de espaçamento. Múltiplos de 4. */
export const esp = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const texto = {
  titulo: { fontSize: 26, fontWeight: '700' as const, lineHeight: 32 },
  subtitulo: { fontSize: 20, fontWeight: '600' as const, lineHeight: 26 },
  corpo: { fontSize: 17, fontWeight: '400' as const, lineHeight: 24 },
  corpoForte: { fontSize: 17, fontWeight: '600' as const, lineHeight: 24 },
  apoio: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  rotulo: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1 },
} as const;

export const raio = { sm: 10, md: 12, lg: 14, xl: 16 } as const;

/**
 * Altura mínima de qualquer coisa clicável.
 * Não diminuir para "caber mais na tela" — cabe menos de propósito.
 */
export const ALVO_MINIMO = 56;
