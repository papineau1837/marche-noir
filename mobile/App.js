import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './src/services/supabase';
import AuthScreen from './src/screens/AuthScreen';
import MainMenuScreen from './src/screens/MainMenuScreen';
import RulesScreen from './src/screens/RulesScreen';
import TradingScreen from './src/screens/TradingScreen';
import DarknetStoreScreen from './src/screens/DarknetStoreScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';

const Stack = createNativeStackNavigator();
// Mettre à true uniquement pour une démo locale sans compte.
const DEV_BYPASS_AUTH = false;

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;

    const hideNavigationBar = async () => {
      try {
        await NavigationBar.setVisibilityAsync('hidden');
        await NavigationBar.setBehaviorAsync('overlay-swipe');
        await NavigationBar.setPositionAsync('absolute');
        await NavigationBar.setBackgroundColorAsync('#0A0A0A');
      } catch (error) {
        console.warn('Barre de navigation non configurable:', error);
      }
    };

    hideNavigationBar();

    return () => {
      NavigationBar.setVisibilityAsync('visible').catch(() => {});
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (mounted) setSession(data.session);
      } catch (error) {
        console.error('Erreur de session Supabase:', error);
        if (mounted) setSession(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#00FF66" />
      </View>
    );
  }

  return (
    <>
      <StatusBar hidden />
      <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0A' } }}>
        {DEV_BYPASS_AUTH || (session && session.user) ? (
          <>
            <Stack.Screen name="Menu">
              {(props) => <MainMenuScreen {...props} session={session} />}
            </Stack.Screen>
            <Stack.Screen name="Rules" component={RulesScreen} />
            <Stack.Screen name="Trading">
              {(props) => <TradingScreen {...props} session={session} />}
            </Stack.Screen>
            <Stack.Screen name="DarknetStore">
              {(props) => <DarknetStoreScreen {...props} session={session} />}
            </Stack.Screen>
            <Stack.Screen name="Leaderboard">
              {(props) => <LeaderboardScreen {...props} session={session} />}
            </Stack.Screen>
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
