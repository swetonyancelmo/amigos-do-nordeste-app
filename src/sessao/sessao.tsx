/**
 * Ativação do aparelho e trava por PIN.
 *
 * Estados possíveis, nesta ordem:
 *   SEM_ATIVACAO  → precisa digitar o código de convite (exige internet, uma vez)
 *   SEM_PIN       → ativado, mas ainda não criou o PIN
 *   TRANCADO      → tem PIN, precisa digitar para abrir
 *   ABERTO        → pode usar o app
 *
 * O PIN é guardado com hash no SecureStore. Não é grande segurança — quatro
 * dígitos não são —, mas é o suficiente para o objetivo real: o celular na mão
 * de outra pessoa não abre um app com dado de família dentro.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const CHAVE_TOKEN = 'token_aparelho';
const CHAVE_PIN = 'pin_hash';
const CHAVE_AGENTE = 'nome_agente';

export type EstadoSessao = 'CARREGANDO' | 'SEM_ATIVACAO' | 'SEM_PIN' | 'TRANCADO' | 'ABERTO';

export async function lerTokenDoAparelho(): Promise<string | null> {
  return SecureStore.getItemAsync(CHAVE_TOKEN);
}

async function hashDoPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `and:${pin}`);
}

type Contexto = {
  estado: EstadoSessao;
  nomeAgente: string | null;
  /** Guarda o token devolvido pelo servidor depois do código de convite. */
  ativar: (token: string, nome: string) => Promise<void>;
  definirPin: (pin: string) => Promise<void>;
  destrancar: (pin: string) => Promise<boolean>;
  trancar: () => void;
};

const Ctx = createContext<Contexto | null>(null);

export function ProvedorSessao({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<EstadoSessao>('CARREGANDO');
  const [nomeAgente, setNome] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [token, pin, nome] = await Promise.all([
        SecureStore.getItemAsync(CHAVE_TOKEN),
        SecureStore.getItemAsync(CHAVE_PIN),
        SecureStore.getItemAsync(CHAVE_AGENTE),
      ]);
      setNome(nome);
      if (!token) setEstado('SEM_ATIVACAO');
      else if (!pin) setEstado('SEM_PIN');
      else setEstado('TRANCADO');
    })();
  }, []);

  const ativar = useCallback(async (token: string, nome: string) => {
    await SecureStore.setItemAsync(CHAVE_TOKEN, token);
    await SecureStore.setItemAsync(CHAVE_AGENTE, nome);
    setNome(nome);
    setEstado('SEM_PIN');
  }, []);

  const definirPin = useCallback(async (pin: string) => {
    await SecureStore.setItemAsync(CHAVE_PIN, await hashDoPin(pin));
    setEstado('ABERTO');
  }, []);

  const destrancar = useCallback(async (pin: string) => {
    const guardado = await SecureStore.getItemAsync(CHAVE_PIN);
    const confere = guardado === (await hashDoPin(pin));
    if (confere) setEstado('ABERTO');
    return confere;
  }, []);

  const trancar = useCallback(() => setEstado('TRANCADO'), []);

  return (
    <Ctx.Provider value={{ estado, nomeAgente, ativar, definirPin, destrancar, trancar }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSessao(): Contexto {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSessao precisa estar dentro de <ProvedorSessao>');
  return c;
}
