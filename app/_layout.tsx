import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProvedorSessao } from '@/sessao/sessao';
import { cores } from '@/design/tokens';

export default function Layout() {
  return (
    <SafeAreaProvider>
      <ProvedorSessao>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: cores.papel },
          }}
        />
      </ProvedorSessao>
    </SafeAreaProvider>
  );
}
