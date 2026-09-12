import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Aviso } from '@/design/componentes';
import { ALVO_MINIMO, cores, esp, raio, texto } from '@/design/tokens';
import { useSessao } from '@/sessao/sessao';

/**
 * Teclado numérico próprio em vez do teclado do sistema.
 *
 * Motivo: teclas de 107x64 são muito maiores que as do teclado padrão, e o
 * app não depende da configuração de teclado que a agente tem no celular
 * dela — que pode estar em outro idioma, com sugestão, com tema escuro.
 */
export default function Pin() {
  const { criar } = useLocalSearchParams<{ criar?: string }>();
  const criando = criar === '1';

  const { nomeAgente, definirPin, destrancar } = useSessao();
  const router = useRouter();

  const [digitos, setDigitos] = useState('');
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function completou(pin: string) {
    setErro(null);

    if (!criando) {
      const ok = await destrancar(pin);
      if (ok) router.replace('/inicio');
      else {
        setErro('Não é esse número. Tente de novo.');
        setDigitos('');
      }
      return;
    }

    if (confirmando === null) {
      setConfirmando(pin);
      setDigitos('');
      return;
    }

    if (confirmando === pin) {
      await definirPin(pin);
      router.replace('/inicio');
    } else {
      setErro('Os dois números não bateram. Vamos começar de novo.');
      setConfirmando(null);
      setDigitos('');
    }
  }

  function tocar(tecla: string) {
    if (tecla === '<') {
      setDigitos(d => d.slice(0, -1));
      return;
    }
    const novo = digitos + tecla;
    if (novo.length > 4) return;
    setDigitos(novo);
    if (novo.length === 4) completou(novo);
  }

  const titulo = criando
    ? confirmando === null
      ? 'Crie uma senha de 4 números'
      : 'Digite os mesmos 4 números'
    : `Olá, ${nomeAgente ?? 'agente'}`;

  const subtitulo = criando
    ? 'É com ela que você vai abrir o aplicativo todo dia. Escolha uma que não esqueça.'
    : 'Digite seus 4 números';

  return (
    <View style={e.tela}>
      <Text style={e.titulo}>{titulo}</Text>
      <Text style={e.p}>{subtitulo}</Text>

      <View style={e.bolinhas}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={[e.bolinha, i < digitos.length && e.bolinhaCheia]}>
            <Text style={e.ponto}>{i < digitos.length ? '•' : ''}</Text>
          </View>
        ))}
      </View>

      {erro ? <Aviso tom="erro">{erro}</Aviso> : null}

      <View style={{ flex: 1 }} />

      <View style={e.teclado}>
        {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', '<']].map((linha, i) => (
          <View key={i} style={e.linha}>
            {linha.map((k, j) =>
              k === '' ? (
                <View key={j} style={e.tecla} />
              ) : (
                <Pressable
                  key={j}
                  accessibilityRole="button"
                  accessibilityLabel={k === '<' ? 'Apagar' : k}
                  onPress={() => tocar(k)}
                  style={({ pressed }) => [e.tecla, e.teclaAtiva, pressed && { opacity: 0.7 }]}>
                  <Text style={k === '<' ? e.teclaApagar : e.teclaTexto}>
                    {k === '<' ? 'apagar' : k}
                  </Text>
                </Pressable>
              ),
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, padding: esp.lg, paddingTop: 80, gap: esp.md },
  titulo: { ...texto.titulo, color: cores.tinta },
  p: { ...texto.corpo, color: cores.apagado },

  bolinhas: { flexDirection: 'row', gap: 14, justifyContent: 'center', marginTop: esp.md },
  bolinha: {
    width: 62,
    height: 72,
    borderRadius: raio.lg,
    borderWidth: 1.5,
    borderColor: cores.linha,
    backgroundColor: cores.branco,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bolinhaCheia: { borderWidth: 2, borderColor: cores.tinta },
  ponto: { fontSize: 30, fontWeight: '700', color: cores.tinta },

  teclado: { gap: 10 },
  linha: { flexDirection: 'row', gap: 10 },
  tecla: {
    flex: 1,
    height: ALVO_MINIMO + 8,
    borderRadius: raio.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teclaAtiva: { backgroundColor: cores.branco, borderWidth: 1, borderColor: cores.linha },
  teclaTexto: { fontSize: 26, fontWeight: '600', color: cores.tinta },
  teclaApagar: { fontSize: 15, fontWeight: '500', color: cores.apagado },
});
