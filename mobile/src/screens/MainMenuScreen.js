import React, { useRef } from 'react';
import { Alert, Animated, BackHandler, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { signOut } from '../services/auth';
import { FEATURES } from '../config';

export default function MainMenuScreen({ navigation, session }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const isGuest = !session?.user;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const openScreen = (screen) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate(screen);
  };

  const leave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isGuest) {
      await signOut();
      return;
    }

    if (Platform.OS === 'android') {
      BackHandler.exitApp();
    } else {
      Alert.alert('Fermer', 'Utilisez le geste système pour quitter l’application.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.brandBlock}>
          <Animated.View style={[styles.signal, { transform: [{ scale: pulse }] }]} />
          <Text style={styles.kicker}>RÉSEAU PRIVÉ // CANAL CHIFFRÉ</Text>
          <Text style={styles.title}>MARCHÉ{ '\n' }NOIR</Text>
          <Text style={styles.subtitle}>Le marché ne dort jamais.</Text>
        </View>

        <View style={styles.menu}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => openScreen('Trading')}>
            <Text style={styles.primaryText}>ENTRER SUR LE MARCHÉ</Text>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuButton} onPress={() => openScreen('DarknetStore')}>
            <Text style={styles.menuLabel}>BOUTIQUE OFFSHORE</Text>
            <Text style={styles.menuHint}>Jetons noirs et contrats spéciaux</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuButton, !FEATURES.monetization && styles.disabledButton]} disabled={!FEATURES.monetization}>
            <Text style={styles.menuLabel}>APPROVISIONNEMENT</Text>
            <Text style={styles.menuHint}>Paiements RevenueCat désactivés pendant l’alpha/bêta</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuButton} onPress={() => openScreen('Leaderboard')}>
            <Text style={styles.menuLabel}>CLASSEMENT DU SYNDICAT</Text>
            <Text style={styles.menuHint}>Voir qui contrôle le marché</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuButton} onPress={() => openScreen('Rules')}>
            <Text style={styles.menuLabel}>RÈGLES / TUTORIEL</Text>
            <Text style={styles.menuHint}>Comprendre le fonctionnement du marché</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.status}>{isGuest ? 'MODE TEST LOCAL' : 'SESSION SÉCURISÉE'}</Text>
          <TouchableOpacity onPress={leave}>
            <Text style={styles.leaveText}>{isGuest ? 'FERMER' : 'DÉCONNEXION'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090909' },
  content: { flex: 1, padding: 22, justifyContent: 'space-between' },
  brandBlock: { marginTop: 44 },
  signal: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00FF66', marginBottom: 18 },
  kicker: { color: '#666', fontSize: 10, letterSpacing: 1.2, marginBottom: 12 },
  title: { color: '#F4F4F4', fontSize: 46, fontWeight: '900', lineHeight: 45, letterSpacing: 3 },
  subtitle: { color: '#00FF66', fontSize: 13, marginTop: 16, letterSpacing: 0.8 },
  menu: { gap: 12 },
  primaryButton: { backgroundColor: '#00FF66', borderRadius: 6, padding: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryText: { color: '#000', fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
  arrow: { color: '#000', fontSize: 24, fontWeight: '300' },
  menuButton: { borderWidth: 1, borderColor: '#292929', borderRadius: 6, padding: 15, backgroundColor: '#121212' },
  menuLabel: { color: '#E8E8E8', fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  menuHint: { color: '#666', fontSize: 10, marginTop: 5 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { color: '#00FF66', fontSize: 9, letterSpacing: 1 },
  leaveText: { color: '#666', fontSize: 9, letterSpacing: 1 },
});
