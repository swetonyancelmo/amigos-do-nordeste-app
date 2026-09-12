import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSessao } from '@/sessao/sessao';
import { cores } from '@/design/tokens';

/** Porta de entrada: manda para a tela certa conforme o estado da sessão. */
export default function Entrada() {
  const { estado } = useSessao();
  const router = useRouter();

  useEffect(() => {
    if (estado === 'CARREGANDO') return;
    if (estado === 'SEM_ATIVACAO') router.replace('/ativar');
    else if (estado === 'SEM_PIN') router.replace('/pin?criar=1');
    else if (estado === 'TRANCADO') router.replace('/pin');
    else router.replace('/inicio');
  }, [estado, router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={cores.laranja} size="large" />
    </View>
  );
}
