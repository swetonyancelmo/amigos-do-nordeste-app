import { expect, test } from '@jest/globals';
import { criarGravador } from '../gravador';

/** Escrita falsa que só termina quando o teste manda. */
function escritaControlada() {
  const gravados: string[] = [];
  const emAndamento: Array<() => void> = [];
  let simultaneas = 0;
  let maxSimultaneas = 0;

  const gravar = (v: string) =>
    new Promise<void>(resolve => {
      simultaneas++;
      maxSimultaneas = Math.max(maxSimultaneas, simultaneas);
      emAndamento.push(() => {
        simultaneas--;
        gravados.push(v);
        resolve();
      });
    });

  const terminarProxima = async () => {
    emAndamento.shift()?.();
    await new Promise(r => setTimeout(r, 0));
  };

  return { gravar, gravados, terminarProxima, max: () => maxSimultaneas };
}

test('nunca grava duas vezes ao mesmo tempo e a última palavra é a da tela', async () => {
  const f = escritaControlada();
  const g = criarGravador(f.gravar);

  g.agendar('M');
  g.agendar('Ma');
  g.agendar('Mar');
  await f.terminarProxima(); // termina 'M', começa a última pendente
  await f.terminarProxima();

  expect(await g.esvaziar()).toBe(true);
  expect(f.gravados).toEqual(['M', 'Mar']);
  expect(f.max()).toBe(1);
});

test('agendar depois de esvaziar volta a gravar', async () => {
  const f = escritaControlada();
  const g = criarGravador(f.gravar);

  g.agendar('a');
  await f.terminarProxima();
  await g.esvaziar();

  g.agendar('b');
  await f.terminarProxima();
  await g.esvaziar();

  expect(f.gravados).toEqual(['a', 'b']);
});

test('avisa a falha e esvaziar responde falso até uma escrita dar certo', async () => {
  let quebrado = true;
  const falhas: unknown[] = [];
  const g = criarGravador(
    async () => {
      if (quebrado) throw new Error('disco cheio');
    },
    erro => falhas.push(erro),
  );

  g.agendar('x');
  expect(await g.esvaziar()).toBe(false);
  expect(falhas).toHaveLength(1);

  quebrado = false;
  g.agendar('y');
  expect(await g.esvaziar()).toBe(true);
});
