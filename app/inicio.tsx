import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Aviso, Botao } from '@/design/componentes';
import { cores, esp, raio, texto } from '@/design/tokens';
import { contarPendentes } from '@/dados/fila';
import { useSessao } from '@/sessao/sessao';

/**
 * A tela inicial.
 *
 * O elemento mais importante aqui NÃO é o botão de cadastrar — é o contador de
 * quantos cadastros estão parados no celular. Se isso não estiver na cara, a
 * agente esquece de sincronizar e o dado fica preso no aparelho dela.
 */
export default function Inicio() {
  const { nomeAgente } = useSessao();
  const router = useRouter();

  const [pendentes, setPendentes] = useState(0);

  useFocusEffect(
    useCallback(() => {
      contarPendentes().then(setPendentes);
    }, []),
  );

  return (
    <View style={e.tela}>
      <View>
        <Text style={e.nome}>{nomeAgente ?? 'Agente de saúde'}</Text>
        <Text style={e.papel}>Agente comunitária de saúde</Text>
      </View>

      {pendentes > 0 ? (
        <View style={e.fila}>
          <View style={e.contador}>
            <Text style={e.numero}>{pendentes}</Text>
            <Text style={e.contadorTexto}>
              {pendentes === 1 ? 'cadastro esperando envio' : 'cadastros esperando envio'}
            </Text>
          </View>
          <Botao titulo="Enviar agora" aoTocar={() => router.push('/enviando')} />
          <Text style={e.miudo}>
            Precisa de internet. Você pode continuar cadastrando sem enviar.
          </Text>
        </View>
      ) : (
        <Aviso titulo="Tudo enviado" tom="calmo">
          Não há nada esperando no celular.
        </Aviso>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/cadastro/familia')}
        style={({ pressed }) => [e.principal, pressed && { opacity: 0.9 }]}>
        <Text style={e.mais}>+</Text>
        <Text style={e.principalTexto}>Cadastrar uma família</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/enviados')}
        style={e.atalho}>
        <View style={{ flex: 1 }}>
          <Text style={e.atalhoTitulo}>Meus cadastros</Text>
          <Text style={e.miudo}>Ver o que já foi enviado</Text>
        </View>
        <Text style={e.seta}>›</Text>
      </Pressable>
    </View>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, padding: esp.lg, paddingTop: 60, gap: esp.md },
  nome: { ...texto.subtitulo, color: cores.tinta },
  papel: { ...texto.apoio, color: cores.apagado },

  fila: {
    backgroundColor: cores.laranjaSuave,
    borderWidth: 2,
    borderColor: cores.laranja,
    borderRadius: raio.xl,
    padding: esp.lg,
    gap: esp.md,
  },
  contador: { flexDirection: 'row', alignItems: 'center', gap: esp.sm },
  numero: { fontSize: 44, fontWeight: '700', color: cores.laranja },
  contadorTexto: { ...texto.corpoForte, color: cores.tinta, flex: 1 },
  miudo: { ...texto.apoio, color: cores.apagado },

  principal: {
    backgroundColor: cores.verde,
    borderRadius: raio.xl,
    paddingVertical: esp.lg,
    alignItems: 'center',
    gap: esp.xs,
  },
  mais: { fontSize: 34, fontWeight: '700', color: cores.branco, lineHeight: 38 },
  principalTexto: { fontSize: 20, fontWeight: '600', color: cores.branco },

  atalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: esp.md,
    backgroundColor: cores.branco,
    borderWidth: 1.5,
    borderColor: cores.linha,
    borderRadius: raio.lg,
    padding: esp.md,
  },
  atalhoTitulo: { ...texto.corpoForte, color: cores.tinta },
  seta: { fontSize: 26, color: cores.apagado },
});
