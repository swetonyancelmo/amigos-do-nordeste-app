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

  /**
   * Versões escuras para escrever texto EM CIMA da cor "Suave" correspondente
   * (Selo, título de Aviso, título de Destaque). A cor "cheia" (laranja,
   * verde, ambar) não passa de 3.6:1 contra a própria versão Suave — falha o
   * mínimo de 4.5:1 de texto (WCAG AA), o que é inaceitável com o app sendo
   * lido ao sol. Essas três têm 5.9:1 ou mais.
   */
  laranjaEscrita: '#A62F0C',
  verdeEscrita: '#0A5E22',
  ambarEscrita: '#7A4E00',

  /**
   * Fundo de botão com texto branco. O laranja e o verde da marca dão 4.1:1
   * com branco — abaixo dos 4.5:1 que texto de 19px pede (só conta como
   * "texto grande" a partir de 24px, ou 18.7px em negrito). Estes dão 5.1:1 e
   * 5.3:1. O laranja e o verde de marca continuam nos detalhes sem texto.
   */
  laranjaBotao: '#C93A0F',
  verdeBotao: '#0E7D30',

  /**
   * Borda de controle (campo, opção, caixa de marcar, casa do PIN). A `linha`
   * dá 1.35:1 contra o branco: ao sol, campo vazio e opção desmarcada somem.
   * Esta dá 3.8:1, acima do mínimo de 3:1 para limite de componente.
   */
  bordaControle: '#8C8178',
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
  rotulo: { fontSize: 13, fontWeight: '700' as const, letterSpacing: 1 },
} as const;

export const raio = { sm: 10, md: 12, lg: 14, xl: 16 } as const;

/**
 * Altura mínima de qualquer coisa clicável.
 * Não diminuir para "caber mais na tela" — cabe menos de propósito.
 */
export const ALVO_MINIMO = 56;
