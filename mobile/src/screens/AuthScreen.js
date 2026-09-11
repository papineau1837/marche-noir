import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { signIn, signUp } from '../services/auth';

export default function AuthScreen({ onAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (isRegistering) {
        await signUp(email, password);
        Alert.alert('Succès', 'Compte créé. Connecte-toi maintenant.');
        setIsRegistering(false);
      } else {
        await signIn(email, password);
        onAuthenticated();
      }
    } catch (error) {
      Alert.alert('Erreur', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>MARCHÉ NOIR</Text>
        <Text style={styles.subtitle}>// ACCÈS SÉCURISÉ REQUIS</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#555"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#555"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleAuth}>
          <Text style={styles.buttonText}>{isRegistering ? 'CRÉER COMPTE' : 'SE CONNECTER'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            setIsRegistering(!isRegistering);
          }}
          style={styles.switchButton}
        >
          <Text style={styles.switchText}>
            {isRegistering ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? S\'inscrire'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
  },
  content: {
    padding: 24,
  },
  title: {
    color: '#00FF66',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#141414',
    color: '#FFF',
    padding: 14,
    borderRadius: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  button: {
    backgroundColor: '#00FF66',
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#888',
    fontSize: 12,
  },
});