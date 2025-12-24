import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/theme';
import { AnimatedSplash } from '@/components/AnimatedSplash';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

// Custom theme with Hatch colors
const HatchLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.primary,
    background: Colors.light.background,
    card: Colors.light.surface,
    text: Colors.light.text,
    border: Colors.light.border,
  },
};

const HatchDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.primary,
    background: Colors.dark.background,
    card: Colors.dark.surface,
    text: Colors.dark.text,
    border: Colors.dark.border,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <AppWithSplash />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function AppWithSplash() {
  const { isLoading: authLoading } = useAuth();
  const [splashComplete, setSplashComplete] = useState(false);

  const isReady = !authLoading;

  if (!splashComplete) {
    return (
      <>
        <ThemedStack />
        <AnimatedSplash
          isReady={isReady}
          onAnimationComplete={() => setSplashComplete(true)}
        />
      </>
    );
  }

  return <ThemedStack />;
}

function ThemedStack() {
  const { effectiveColorScheme } = useTheme();

  return (
    <NavigationThemeProvider value={effectiveColorScheme === 'dark' ? HatchDarkTheme : HatchLightTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="invite/[code]" options={{ headerShown: false }} />
        <Stack.Screen name="explore/[origin]" options={{ headerShown: false }} />
        <Stack.Screen
          name="name/[id]"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
    </NavigationThemeProvider>
  );
}
