/**
 * Grava o rascunho a cada mudança sem deixar duas escritas se cruzarem.
 *
 * A tela chama `agendar` a cada tecla. Se uma escrita ainda está em andamento,
 * a nova não dispara junto: fica guardada e sai logo depois. Se chegarem várias
 * nesse meio tempo, só a última vai — cada escrita leva o estado inteiro, então
 * as do meio já estariam velhas.
 *
 * Sem isso, duas escritas simultâneas podem terminar fora de ordem e a mais
 * antiga sobrescrever a mais nova: a agente vê o texto na tela, fecha o app e
 * ao reabrir falta a última letra.
 */
export type Gravador<T> = {
  agendar: (valor: T) => void;
  /** Espera tudo o que foi agendado chegar ao banco. Falso se a última escrita falhou. */
  esvaziar: () => Promise<boolean>;
};

export function criarGravador<T>(
  gravar: (valor: T) => Promise<void>,
  aoFalhar?: (erro: unknown) => void,
): Gravador<T> {
  let pendente: { valor: T } | null = null;
  let rodando: Promise<void> | null = null;
  let falhou = false;

  async function laco() {
    while (pendente) {
      const { valor } = pendente;
      pendente = null;
      try {
        await gravar(valor);
        falhou = false;
      } catch (erro) {
        // não tenta de novo sozinho: a próxima mudança leva o estado inteiro
        // e cobre esta.
        falhou = true;
        aoFalhar?.(erro);
      }
    }
    // zerado aqui dentro, e não num .finally, para não abrir uma brecha em que
    // um agendar veria `rodando` ainda preenchido e a escrita ficaria parada.
    rodando = null;
  }

  return {
    agendar(valor) {
      pendente = { valor };
      if (!rodando) rodando = laco();
    },
    async esvaziar() {
      while (rodando) await rodando;
      return !falhou;
    },
  };
}
