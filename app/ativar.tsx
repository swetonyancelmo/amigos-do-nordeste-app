import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Aviso, Botao, Campo } from '@/design/componentes';
import { cores, esp, texto } from '@/design/tokens';
import { apiPost } from '@/dados/api';
import { SemInternet } from '@/dados/sincronizar';
import { useSessao } from '@/sessao/sessao';

type RespostaAtivacao = { token: string; nomeAgente: string };

export default function Ativar() {
  const { ativar } = useSessao();
  const router = useRouter();
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const limpo = codigo.replace(/\D/g, '');

  async function continuar() {
    setErro(null);
    setCarregando(true);
    try {
      const r = await apiPost<RespostaAtivacao>('/api/agentes/ativar', { codigo: limpo });
      await ativar(r.token, r.nomeAgente);
      router.replace('/pin?criar=1');
    } catch (e) {
      setErro(
        e instanceof SemInternet
          ? 'Você precisa de internet só nesta primeira vez. Tente perto de um sinal.'
          : 'Código não encontrado. Confira os números com a associação.',
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={e.tela} keyboardShouldPersistTaps="handled">
      <Text style={e.titulo}>Bem-vinda!</Text>
      <Text style={e.p}>
        Digite o código que a associação te passou. Você só faz isso uma vez.
      </Text>

      <Campo
        rotulo="Código"
        value={codigo}
        onChangeText={setCodigo}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="000000"
        autoFocus
      />

      {erro ? <Aviso tom="erro">{erro}</Aviso> : null}

      <Aviso tom="atencao">
        O código chega por WhatsApp e vale para um celular só.
      </Aviso>

      <View style={{ flex: 1 }} />

      <Botao
        titulo="Continuar"
        aoTocar={continuar}
        carregando={carregando}
        desabilitado={limpo.length < 6}
      />

      {__DEV__ ? (
        // Atalho só em desenvolvimento: pula a API para dar para ver o fluxo.
        <Botao
          titulo="Entrar sem código (dev)"
          variante="contorno"
          aoTocar={async () => {
            await ativar('token-dev', 'Maria');
            router.replace('/pin?criar=1');
          }}
        />
      ) : null}
    </ScrollView>
  );
}

const e = StyleSheet.create({
  tela: { flexGrow: 1, padding: esp.lg, paddingTop: 72, gap: esp.md },
  titulo: { ...texto.titulo, color: cores.tinta },
  p: { ...texto.corpo, color: cores.apagado },
});
