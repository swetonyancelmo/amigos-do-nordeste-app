import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Aviso, Botao, Campo, Titulo } from '@/design/componentes';
import { cores, esp, texto } from '@/design/tokens';
import { apiPost } from '@/dados/api';
import { mensagemFalhaAtivacao } from '@/dados/ativacao';
import { atualizarComunidades } from '@/dados/comunidades';
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
      // Aproveita a internet desta primeira vez para trazer a lista de
      // comunidades — daí em diante o Passo 1 funciona offline. Se falhar, a
      // ativação vale do mesmo jeito: o Passo 1 tem o botão de atualizar e
      // o "Outra comunidade".
      await atualizarComunidades().catch(() => undefined);
      router.replace('/pin?criar=1');
    } catch (e) {
      setErro(mensagemFalhaAtivacao(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={e.tela} keyboardShouldPersistTaps="handled">
      <Titulo>Bem-vinda!</Titulo>
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
        // o erro fica no próprio campo: é lido junto com ele e anunciado ao aparecer
        erro={erro ?? undefined}
      />

      <Aviso tom="atencao">
        O código chega por WhatsApp e vale para um celular só.
      </Aviso>

      <View style={{ flex: 1 }} />

      <Botao
        titulo="Continuar"
        aoTocar={continuar}
        carregando={carregando}
        desabilitado={limpo.length < 6}
        dica={limpo.length < 6 ? 'Digite os 6 números do código para continuar.' : undefined}
      />

    </ScrollView>
  );
}

const e = StyleSheet.create({
  tela: { flexGrow: 1, padding: esp.lg, paddingTop: 72, gap: esp.md },
  p: { ...texto.corpo, color: cores.apagado },
});
