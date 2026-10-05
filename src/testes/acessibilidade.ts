/**
 * Apoio aos testes de acessibilidade das telas (src/__tests__/acessibilidade).
 *
 * Os testes procuram os elementos como o TalkBack os vê: por papel e nome
 * acessível. Quando um teste não acha o elemento por aí, é bug de
 * acessibilidade, não do teste.
 *
 * Nunca importe este módulo fora de teste.
 */
import { jest } from '@jest/globals';
import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { screen } from '@testing-library/react-native';
import type { PreCadastro, Pessoa } from '@/dados/tipos';

/* ------------------------------------------------------------ expo-router */

export const roteador = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  dismissTo: jest.fn(),
  canGoBack: jest.fn(() => true),
};

/** Parâmetros da rota da tela sob teste; cada teste ajusta o que precisa. */
export const parametros: Record<string, string | undefined> = {};

/** Use em `jest.mock('expo-router', () => require('…/testes/acessibilidade').moduloExpoRouter)`. */
export const moduloExpoRouter = {
  useRouter: () => roteador,
  useLocalSearchParams: () => parametros,
  // a tela "ganha foco" uma vez, ao montar
  useFocusEffect: (efeito: () => void | (() => void)) => {
    useEffect(() => efeito(), [efeito]);
  },
  useNavigation: () => ({ addListener: () => () => undefined, dispatch: jest.fn() }),
};

export function limparRota() {
  Object.values(roteador).forEach(f => f.mockClear());
  for (const k of Object.keys(parametros)) delete parametros[k];
}

/* -------------------------------------------------------------- anúncios */

export function espiarAnuncios() {
  return jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
}

/**
 * O texto chega ao leitor de tela sem a agente procurar? Vale se foi passado
 * a `announceForAccessibility` ou se aparece dentro de uma live region
 * (`accessibilityLiveRegion` diferente de "none") ou de `role="alert"`.
 */
export function foiAnunciado(espiao: ReturnType<typeof espiarAnuncios>, padrao: RegExp): boolean {
  if (espiao.mock.calls.some(([m]) => padrao.test(String(m)))) return true;
  for (const el of screen.queryAllByText(padrao)) {
    let n: typeof el | null = el;
    while (n) {
      const p = n.props as Record<string, unknown>;
      if ((p.accessibilityLiveRegion && p.accessibilityLiveRegion !== 'none') || p.accessibilityRole === 'alert' || p.role === 'alert') {
        return true;
      }
      n = n.parent;
    }
  }
  return false;
}

/* --------------------------------------------------------------- medidas */

/** Altura mínima declarada no estilo (height ou minHeight), em dp. */
export function alturaMinima(el: { props: Record<string, unknown> }): number {
  const estilo = el.props.style;
  const plano = StyleSheet.flatten(typeof estilo === 'function' ? estilo({ pressed: false }) : estilo) ?? {};
  const v = (plano as { height?: unknown; minHeight?: unknown }).minHeight ?? (plano as { height?: unknown }).height;
  return typeof v === 'number' ? v : 0;
}

/* ------------------------------------------------------- dados fictícios */

export function pessoaFicticia(p: Partial<Pessoa> = {}): Pessoa {
  return {
    id: 'pessoa-1',
    nome: 'Fulana de Teste',
    cadastroIncompleto: false,
    sexo: 'FEMININO',
    dataNascimento: null,
    idadeEstimada: 30,
    idadeEstimadaEm: '2026-10-01',
    ordem: 0,
    ...p,
  };
}

export function cadastroFicticio(c: Partial<PreCadastro> = {}): PreCadastro {
  return {
    id: 'cadastro-1',
    responsavelNome: 'Fulana de Teste',
    telefone: null,
    comunidadeId: null,
    comunidadeNome: 'Comunidade Exemplo',
    pontoReferencia: null,
    situacao: 'RASCUNHO',
    motivoDevolucao: null,
    criadoEm: '2026-10-01T12:00:00.000Z',
    atualizadoEm: '2026-10-01T12:00:00.000Z',
    enviadoEm: null,
    pessoas: [pessoaFicticia()],
    ...c,
  };
}
