import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './src/services/supabase';
import AuthScreen from './src/screens/AuthScreen';
import TradingScreen from './src/screens/TradingScreen';
import DarknetStoreScreen from './src/screens/DarknetStoreScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
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
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0A' } }}>
        {session && session.user ? (
          <>
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