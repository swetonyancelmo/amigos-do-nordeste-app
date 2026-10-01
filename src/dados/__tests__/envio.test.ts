import { describe, expect, test } from '@jest/globals';
import { desfechoDoEnvio, textoProgresso, textoSemAcesso, textoSemInternet } from '../envio';
import type { ResumoSincronizacao } from '../sincronizar';

function resumo(r: Partial<ResumoSincronizacao>): ResumoSincronizacao {
  return {
    enviados: 0,
    jaRecebidos: 0,
    comErro: 0,
    semInternet: false,
    semAcesso: false,
    recusados: 0,
    aprovados: 0,
    devolvidos: 0,
    ...r,
  };
}

/** Nenhuma mensagem pode deixar escapar termo técnico para a agente. */
const TECNICO = /erro|servidor|status|http|timeout|falha|null|undefined|NaN/i;

describe('textoProgresso', () => {
  test('mostra quantos já foram do total', () => {
    expect(textoProgresso(2, 3)).toBe('2 de 3 enviados');
    expect(textoProgresso(0, 3)).toBe('0 de 3 enviados');
  });

  test('singular quando só há um', () => {
    expect(textoProgresso(1, 1)).toBe('1 de 1 enviado');
  });
});

describe('desfechoDoEnvio', () => {
  test('sem internet vai para a tela própria, levando quantos já foram', () => {
    expect(desfechoDoEnvio(resumo({ enviados: 1, jaRecebidos: 1, semInternet: true }))).toEqual({
      tipo: 'sem-internet',
      enviados: 2,
    });
  });

  test('sem internet ganha de erro: o resto não foi tentado', () => {
    expect(desfechoDoEnvio(resumo({ comErro: 1, semInternet: true })).tipo).toBe('sem-internet');
  });

  test('tudo enviado soma os já recebidos pelo servidor', () => {
    const d = desfechoDoEnvio(resumo({ enviados: 2, jaRecebidos: 1 }));
    expect(d).toMatchObject({ tipo: 'fim', tom: 'calmo', titulo: '3 cadastros enviados' });
  });

  test('um só no singular', () => {
    expect(desfechoDoEnvio(resumo({ enviados: 1 }))).toMatchObject({ titulo: '1 cadastro enviado' });
  });

  test('parte com erro diz que o que ficou continua guardado', () => {
    const d = desfechoDoEnvio(resumo({ enviados: 2, comErro: 1 }));
    expect(d).toMatchObject({ tipo: 'fim', tom: 'atencao', titulo: '1 cadastro não foi desta vez' });
    if (d.tipo !== 'fim') throw new Error('esperava fim');
    expect(d.texto).toMatch(/^2 cadastros foram\. /);
    expect(d.texto).toMatch(/continua guardado no celular, nada se perdeu/);
  });

  test('todos com erro não fala dos que foram', () => {
    const d = desfechoDoEnvio(resumo({ comErro: 3 }));
    if (d.tipo !== 'fim') throw new Error('esperava fim');
    expect(d.titulo).toBe('3 cadastros não foram desta vez');
    expect(d.texto).toMatch(/^Os que ficaram continuam guardados/);
  });

  test('sem acesso vai para a tela própria, levando quantos já foram', () => {
    expect(desfechoDoEnvio(resumo({ enviados: 1, semAcesso: true }))).toEqual({ tipo: 'sem-acesso', enviados: 1 });
  });

  test('recusado pelo servidor volta para corrigir e o texto diz onde ver', () => {
    const d = desfechoDoEnvio(resumo({ enviados: 1, recusados: 1 }));
    if (d.tipo !== 'fim') throw new Error('esperava fim');
    expect(d.tom).toBe('atencao');
    expect(d.texto).toMatch(/1 cadastro voltou para você corrigir/);
    expect(d.texto).toMatch(/Meus cadastros\.$/);
  });

  test('conta o que a associação aprovou e devolveu desde a última vez', () => {
    const d = desfechoDoEnvio(resumo({ aprovados: 2, devolvidos: 1 }));
    if (d.tipo !== 'fim') throw new Error('esperava fim');
    expect(d.titulo).toBe('Novidades da associação');
    expect(d.tom).toBe('atencao');
    expect(d.texto).toMatch(/devolveu 1 cadastro/);
    expect(d.texto).toMatch(/aprovou 2 cadastros/);
  });

  test('só aprovação é notícia calma', () => {
    const d = desfechoDoEnvio(resumo({ enviados: 1, aprovados: 1 }));
    expect(d).toMatchObject({ tipo: 'fim', tom: 'calmo', titulo: '1 cadastro enviado' });
  });

  test('as novidades também não têm termo técnico', () => {
    const d = desfechoDoEnvio(resumo({ enviados: 1, comErro: 1, recusados: 2, aprovados: 1, devolvidos: 1 }));
    if (d.tipo !== 'fim') throw new Error('esperava fim');
    expect(d.texto).not.toMatch(TECNICO);
  });

  test('fila vazia não finge que enviou', () => {
    expect(desfechoDoEnvio(resumo({}))).toMatchObject({ titulo: 'Não havia nada para enviar' });
  });

  test('nenhuma mensagem tem termo técnico', () => {
    const casos = [
      resumo({ enviados: 3 }),
      resumo({ enviados: 1, comErro: 2 }),
      resumo({ comErro: 1 }),
      resumo({}),
    ];
    for (const c of casos) {
      const d = desfechoDoEnvio(c);
      if (d.tipo !== 'fim') throw new Error('esperava fim');
      expect(`${d.titulo} ${d.texto}`).not.toMatch(TECNICO);
    }
  });
});

describe('textoSemInternet', () => {
  test('diz quantos continuam guardados', () => {
    expect(textoSemInternet(3, 0)).toBe('Seus 3 cadastros continuam guardados no celular, nada se perdeu.');
    expect(textoSemInternet(1, 0)).toBe('Seu cadastro continua guardado no celular, nada se perdeu.');
  });

  test('conta os que chegaram antes do sinal cair', () => {
    expect(textoSemInternet(1, 2)).toBe(
      '2 cadastros chegaram antes do sinal cair. Seu cadastro continua guardado no celular, nada se perdeu.',
    );
  });

  test('nenhum texto tem termo técnico', () => {
    for (const [g, e] of [[0, 0], [0, 1], [1, 0], [4, 2]]) {
      expect(textoSemInternet(g, e)).not.toMatch(TECNICO);
    }
  });
});

describe('textoSemAcesso', () => {
  test('diz que o que ficou continua guardado e vai depois de ativar', () => {
    expect(textoSemAcesso(2, 1)).toBe(
      '1 cadastro chegou antes. Seus 2 cadastros continuam guardados no celular e vão quando o celular for ativado de novo.',
    );
  });

  test('nenhum texto tem termo técnico', () => {
    for (const [g, e] of [[0, 0], [1, 0], [3, 2]]) {
      expect(textoSemAcesso(g, e)).not.toMatch(TECNICO);
    }
  });
});
