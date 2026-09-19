/**
 * Os componentes que todas as telas usam.
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

/** `tracejado` é o "adicionar mais um": convite, não ação principal. */
type VarianteBotao = 'primario' | 'confirmar' | 'contorno' | 'tracejado';

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
  const vazado = variante === 'contorno' || variante === 'tracejado';
  const fundo = variante === 'confirmar' ? cores.verde : vazado ? 'transparent' : cores.laranja;
  const corTexto = vazado ? cores.tinta : cores.branco;

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
        variante === 'tracejado' && { borderWidth: 2, borderColor: cores.apagado, borderStyle: 'dashed' },
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

/* ------------------------------------------------------------- ItemLista */

/**
 * Uma linha de lista que abre algo ao tocar, com uma ação secundária opcional
 * à direita (ex.: "Remover"). A ação tem alvo de toque próprio, separado da
 * linha, para não abrir a pessoa quando a intenção era remover — e vice-versa.
 */
export function ItemLista({
  titulo,
  detalhe,
  selo,
  aoTocar,
  acao,
}: {
  titulo: string;
  detalhe?: string;
  selo?: React.ReactNode;
  aoTocar: () => void;
  acao?: { titulo: string; aoTocar: () => void; rotuloAcessivel?: string };
}) {
  return (
    <View style={e.item}>
      <Pressable
        accessibilityRole="button"
        onPress={aoTocar}
        style={({ pressed }) => [e.itemCorpo, pressed && { opacity: 0.85 }]}>
        <Text style={e.itemTitulo}>{titulo}</Text>
        {detalhe ? <Text style={e.dica}>{detalhe}</Text> : null}
        {selo}
      </Pressable>
      {acao ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={acao.rotuloAcessivel ?? acao.titulo}
          onPress={acao.aoTocar}
          style={({ pressed }) => [e.itemAcao, pressed && { opacity: 0.6 }]}>
          <Text style={e.itemAcaoTexto}>{acao.titulo}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ----------------------------------------------------------------- Opções */

/**
 * Escolha de uma opção numa lista curta. Linhas inteiras tocáveis em vez de
 * um picker do sistema: o picker abre um menu miúdo, difícil de acertar com
 * uma mão só.
 */
export function Opcoes<T extends string>({
  rotulo,
  opcoes,
  selecionado,
  aoEscolher,
}: {
  rotulo: string;
  opcoes: ReadonlyArray<{ valor: T; titulo: string }>;
  selecionado: T | null;
  aoEscolher: (valor: T) => void;
}) {
  return (
    <View style={{ gap: esp.sm }} accessibilityRole="radiogroup" accessibilityLabel={rotulo}>
      <Text style={e.rotulo}>{rotulo.toUpperCase()}</Text>
      {opcoes.map(o => {
        const marcado = o.valor === selecionado;
        return (
          <Pressable
            key={o.valor}
            accessibilityRole="radio"
            accessibilityState={{ checked: marcado }}
            onPress={() => aoEscolher(o.valor)}
            style={({ pressed }) => [
              e.opcao,
              marcado && e.opcaoMarcada,
              pressed && { opacity: 0.85 },
            ]}>
            <View style={[e.marcador, marcado && e.marcadorCheio]} />
            <Text style={e.opcaoTexto}>{o.titulo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* -------------------------------------------------------------- Progresso */

export function Progresso({ passo, total }: { passo: number; total: number }) {
  return (
    <View
      style={{ gap: esp.sm }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: passo, text: `${passo} de ${total}` }}>
      <View style={e.trilho}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[e.segmento, i < passo && e.segmentoFeito]} />
        ))}
      </View>
      <Text style={e.rotulo}>
        {passo} DE {total}
      </Text>
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

  item: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: raio.md,
    borderWidth: 1.5,
    borderColor: cores.linha,
    backgroundColor: cores.branco,
  },
  itemCorpo: {
    flex: 1,
    minHeight: ALVO_MINIMO + 16,
    justifyContent: 'center',
    gap: esp.xs,
    paddingHorizontal: esp.md,
    paddingVertical: esp.sm,
  },
  itemTitulo: { ...texto.corpoForte, color: cores.tinta },
  itemAcao: {
    minWidth: ALVO_MINIMO + 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1.5,
    borderLeftColor: cores.linha,
    paddingHorizontal: esp.sm,
  },
  itemAcaoTexto: { fontSize: 16, fontWeight: '600', color: cores.laranja },

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

  opcao: {
    minHeight: ALVO_MINIMO,
    flexDirection: 'row',
    alignItems: 'center',
    gap: esp.md,
    borderRadius: raio.md,
    borderWidth: 1.5,
    borderColor: cores.linha,
    backgroundColor: cores.branco,
    paddingHorizontal: esp.md,
  },
  opcaoMarcada: { borderWidth: 2, borderColor: cores.tinta },
  opcaoTexto: { ...texto.corpo, color: cores.tinta, flex: 1 },
  marcador: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: cores.linha,
  },
  marcadorCheio: { borderWidth: 7, borderColor: cores.tinta },

  trilho: { flexDirection: 'row', gap: esp.xs },
  segmento: { flex: 1, height: 6, borderRadius: 3, backgroundColor: cores.linha },
  segmentoFeito: { backgroundColor: cores.laranja },

  selo: { alignSelf: 'flex-start', borderRadius: raio.sm, paddingHorizontal: 10, paddingVertical: 5 },
  seloTexto: { fontSize: 12, fontWeight: '700' },

  aviso: { borderRadius: raio.md, padding: esp.md, gap: esp.xs },
  avisoTitulo: { fontSize: 15, fontWeight: '700' },
  avisoTexto: { ...texto.apoio, color: cores.apagado },
});
