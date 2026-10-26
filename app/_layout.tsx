import React, { useEffect } from 'react';
import { AppState, AppStateStatus, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initDatabase } from '../src/database/sqlite';
import { usePrivateVaultStore } from '../src/store/usePrivateVaultStore';
import { Colors } from '../src/utils/theme';

const queryClient = new QueryClient();

export default function RootLayout() {
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];
  const lockVault = usePrivateVaultStore((state) => state.lock);
  const appState = React.useRef(AppState.currentState);

  useEffect(() => {
    // 1. Initialize local SQLite Database & Migrations
    initDatabase();

    // 2. Security requirement: Automatically lock private area when app goes to background
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current === 'active' && (nextState === 'background' || nextState === 'inactive')) {
        console.log('[Security] App moved to background: locking Private Vault');
        lockVault();
      }
      appState.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [lockVault]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.background,
            },
            headerTintColor: theme.label,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: theme.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="photo/[id]"
            options={{
              headerShown: false,
              presentation: 'fullScreenModal',
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="album/[id]"
            options={{
              title: 'Album',
              headerBackTitle: 'Albums',
            }}
          />
          <Stack.Screen
            name="settings/index"
            options={{
              title: 'Settings',
              headerLargeTitle: true,
            }}
          />
          <Stack.Screen
            name="settings/cloud-accounts"
            options={{
              title: 'Cloud Connections',
            }}
          />
          <Stack.Screen
            name="settings/offline-storage"
            options={{
              title: 'Storage & Downloads',
            }}
          />
          <Stack.Screen
            name="settings/privacy"
            options={{
              title: 'Face ID & Privacy',
            }}
          />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
