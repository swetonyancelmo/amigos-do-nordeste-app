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

/** `erro` toma o lugar da dica e pinta a borda: a agente vê onde está o problema. */
export function Campo({
  rotulo,
  dica,
  erro,
  ...props
}: { rotulo: string; dica?: string; erro?: string } & TextInputProps) {
  return (
    <View style={{ gap: esp.sm }}>
      <Text style={e.rotulo}>{rotulo.toUpperCase()}</Text>
      <TextInput
        placeholderTextColor={cores.apagado}
        style={[e.campo, erro ? e.campoComErro : null]}
        // teclado sempre visível e sem correção automática: nome de pessoa do
        // sertão não está no dicionário do celular e o corretor atrapalha.
        autoCorrect={false}
        accessibilityLabel={rotulo}
        accessibilityHint={erro ?? dica}
        {...props}
      />
      {erro ? (
        <Text style={e.erro} accessibilityLiveRegion="polite">
          {erro}
        </Text>
      ) : dica ? (
        <Text style={e.dica}>{dica}</Text>
      ) : null}
    </View>
  );
}

/* ----------------------------------------------------------------- Marcar */

/** Caixa de marcar numa linha inteira tocável, do mesmo tamanho de uma opção. */
export function Marcar({
  titulo,
  marcado,
  aoMudar,
}: {
  titulo: string;
  marcado: boolean;
  aoMudar: (marcado: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcado }}
      onPress={() => aoMudar(!marcado)}
      style={({ pressed }) => [e.opcao, marcado && e.opcaoMarcada, pressed && { opacity: 0.85 }]}>
      <View style={[e.caixa, marcado && e.caixaCheia]}>
        {marcado ? <Text style={e.caixaVisto}>✓</Text> : null}
      </View>
      <Text style={e.opcaoTexto}>{titulo}</Text>
    </Pressable>
  );
}

/* --------------------------------------------------------------- Destaque */

/**
 * Bloco laranja que chama atenção para uma saída importante dentro de um
 * formulário (ex.: "não sabe a data? ponha a idade aproximada"). Diferente de
 * `Aviso`, aceita campos dentro.
 */
export function Destaque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={e.destaque}>
      <Text style={e.destaqueTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

/* ------------------------------------------------------------- ItemLista */

/**
 * Uma linha de lista que abre algo ao tocar, com uma ação secundária opcional
 * à direita (ex.: "Remover"). A ação tem alvo de toque próprio, separado da
 * linha, para não abrir a pessoa quando a intenção era remover — e vice-versa.
 *
 * Sem `aoTocar` a linha só mostra: não finge ser botão para quem não tem o que
 * abrir (ex.: cadastro já aceito).
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
  aoTocar?: () => void;
  acao?: { titulo: string; aoTocar: () => void; rotuloAcessivel?: string };
}) {
  const corpo = (
    <>
      <Text style={e.itemTitulo}>{titulo}</Text>
      {detalhe ? <Text style={e.dica}>{detalhe}</Text> : null}
      {selo}
    </>
  );
  return (
    <View style={e.item}>
      {aoTocar ? (
        <Pressable
          accessibilityRole="button"
          onPress={aoTocar}
          style={({ pressed }) => [e.itemCorpo, pressed && { opacity: 0.85 }]}>
          {corpo}
        </Pressable>
      ) : (
        <View style={e.itemCorpo}>{corpo}</View>
      )}
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
  campoComErro: { borderWidth: 2, borderColor: cores.laranja },
  dica: { ...texto.apoio, color: cores.apagado },
  erro: { ...texto.apoio, fontWeight: '600', color: cores.laranja },

  caixa: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: cores.linha,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caixaCheia: { backgroundColor: cores.tinta, borderColor: cores.tinta },
  caixaVisto: { color: cores.branco, fontSize: 16, fontWeight: '700' },

  destaque: {
    borderRadius: raio.lg,
    borderWidth: 2,
    borderColor: cores.laranja,
    backgroundColor: cores.laranjaSuave,
    padding: esp.md,
    gap: esp.md,
  },
  destaqueTitulo: { ...texto.corpoForte, color: cores.laranja },

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
