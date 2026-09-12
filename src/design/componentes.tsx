/**
 * Os quatro componentes que todas as telas usam.
 *
 * Se uma tela precisar de um botão diferente, acrescente uma variante aqui —
 * não escreva estilo solto na tela. É isso que mantém o alvo de toque grande
 * em todo lugar, que é o requisito de usabilidade do app.
 */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { ALVO_MINIMO, cores, esp, raio, texto } from './tokens';

/* ------------------------------------------------------------------ Botão */

type VarianteBotao = 'primario' | 'confirmar' | 'contorno';

export function Botao({
  titulo,
  aoTocar,
  variante = 'primario',
  carregando = false,
  desabilitado = false,
  estilo,
}: {
  titulo: string;
  aoTocar: () => void;
  variante?: VarianteBotao;
  carregando?: boolean;
  desabilitado?: boolean;
  estilo?: ViewStyle;
}) {
  const inativo = desabilitado || carregando;
  const fundo =
    variante === 'confirmar' ? cores.verde : variante === 'contorno' ? 'transparent' : cores.laranja;
  const corTexto = variante === 'contorno' ? cores.tinta : cores.branco;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inativo, busy: carregando }}
      onPress={aoTocar}
      disabled={inativo}
      style={({ pressed }) => [
        e.botao,
        { backgroundColor: fundo, opacity: inativo ? 0.5 : pressed ? 0.85 : 1 },
        variante === 'contorno' && { borderWidth: 2, borderColor: cores.tinta },
        estilo,
      ]}>
      {carregando ? (
        <ActivityIndicator color={corTexto} />
      ) : (
        <Text style={[e.botaoTexto, { color: corTexto }]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ Campo */

export function Campo({
  rotulo,
  dica,
  ...props
}: { rotulo: string; dica?: string } & TextInputProps) {
  return (
    <View style={{ gap: esp.sm }}>
      <Text style={e.rotulo}>{rotulo.toUpperCase()}</Text>
      <TextInput
        placeholderTextColor={cores.apagado}
        style={e.campo}
        // teclado sempre visível e sem correção automática: nome de pessoa do
        // sertão não está no dicionário do celular e o corretor atrapalha.
        autoCorrect={false}
        {...props}
      />
      {dica ? <Text style={e.dica}>{dica}</Text> : null}
    </View>
  );
}

/* ------------------------------------------------------------------- Selo */

export function Selo({ texto: t, tom }: { texto: string; tom: 'espera' | 'aceito' | 'devolvido' }) {
  const paleta = {
    espera: { fundo: cores.ambarSuave, cor: cores.ambar },
    aceito: { fundo: cores.verdeSuave, cor: cores.verde },
    devolvido: { fundo: cores.laranjaSuave, cor: cores.laranja },
  }[tom];

  return (
    <View style={[e.selo, { backgroundColor: paleta.fundo }]}>
      <Text style={[e.seloTexto, { color: paleta.cor }]}>{t}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ Aviso */

export function Aviso({
  titulo,
  children,
  tom = 'calmo',
}: {
  titulo?: string;
  children: React.ReactNode;
  tom?: 'calmo' | 'atencao' | 'erro';
}) {
  const paleta = {
    calmo: { fundo: cores.verdeSuave, cor: cores.verde },
    atencao: { fundo: cores.ambarSuave, cor: cores.ambar },
    erro: { fundo: cores.laranjaSuave, cor: cores.laranja },
  }[tom];

  return (
    <View style={[e.aviso, { backgroundColor: paleta.fundo }]}>
      {titulo ? <Text style={[e.avisoTitulo, { color: paleta.cor }]}>{titulo}</Text> : null}
      <Text style={e.avisoTexto}>{children}</Text>
    </View>
  );
}

/* ----------------------------------------------------------------- Estilos */

const e = StyleSheet.create({
  botao: {
    minHeight: ALVO_MINIMO + 8,
    borderRadius: raio.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: esp.lg,
  },
  botaoTexto: { fontSize: 19, fontWeight: '600' },

  rotulo: { ...texto.rotulo, color: cores.apagado },
  campo: {
    minHeight: ALVO_MINIMO + 4,
    borderRadius: raio.md,
    borderWidth: 1.5,
    borderColor: cores.linha,
    backgroundColor: cores.branco,
    paddingHorizontal: esp.md,
    fontSize: 18,
    color: cores.tinta,
  },
  dica: { ...texto.apoio, color: cores.apagado },

  selo: { alignSelf: 'flex-start', borderRadius: raio.sm, paddingHorizontal: 10, paddingVertical: 5 },
  seloTexto: { fontSize: 12, fontWeight: '700' },

  aviso: { borderRadius: raio.md, padding: esp.md, gap: esp.xs },
  avisoTitulo: { fontSize: 15, fontWeight: '700' },
  avisoTexto: { ...texto.apoio, color: cores.apagado },
});
