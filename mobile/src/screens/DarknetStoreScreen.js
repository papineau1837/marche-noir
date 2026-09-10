import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../services/supabase';
import { useNavigation } from '@react-navigation/native';

const STORE_ITEMS = [
  {
    id: 'theme_matrix',
    title: 'Thème Phosphore Vert',
    description: 'Transforme le terminal en moniteur rétro militaire.',
    cost: 100,
    type: 'theme',
  },
  {
    id: 'vpn_shield',
    title: 'Brouilleur VPN Chiffré',
    description: 'Protège l\'anonymat de vos rumeurs sur The Wire pendant 24h.',
    cost: 250,
    type: 'tool',
  },
  {
    id: 'title_cartel',
    title: 'Sceau de Statut : "Parrain"',
    description: 'Affiche un badge exclusif à côté de votre pseudo.',
    cost: 500,
    type: 'cosmetic',
  },
];

export default function DarknetStoreScreen({ session, onRefreshTokens }) {
  const [tokens, setTokens] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    fetchTokens();
  }, [session?.user?.id]);

  const fetchTokens = async () => {
    if (!session?.user?.id) return;
    try {
      const resp = await supabase
        .from('profiles')
        .select('black_tokens')
        .eq('id', session.user.id)
        .single();
      if (resp.data) setTokens(resp.data.black_tokens || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (item) => {
    if (tokens < item.cost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Accès refusé', 'Jetons Noirs insuffisants. Approvisionnez votre compte offshore.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);

    try {
      const token = session.access_token;
      const resp = await fetch('http://localhost:8000/api/store/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ item_id: item.id }),
      });

      const data = await resp.json();
      if (resp.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Acquisition réussie', `Contrat validé : ${item.title}`);
        if (onRefreshTokens) onRefreshTokens();
        fetchTokens();
      } else {
        Alert.alert('Échec', data.detail || 'Impossible de valider la transaction.');
      }
    } catch (error) {
      Alert.alert('Erreur réseau', 'Liaison sécurisée compromise.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#00FF66" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>// MARCHÉ NOIR : BOUTIQUE OFFSHORE</Text>
        <Text style={styles.tokenText}>JETONS NOIRS : {tokens} 🪙</Text>
      </View>

      <FlatList
        data={STORE_ITEMS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDesc}>{item.description}</Text>
            </View>
            <TouchableOpacity
              style={styles.buyButton}
              onPress={() => handlePurchase(item)}
              disabled={loading}
            >
              <Text style={styles.buyButtonText}>
                {loading ? '...' : `${item.cost} 🪙`}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <View style={styles footer}>
        <Text style={styles.backText} onPress={() => navigation.goBack()}>
          ← Retour au terminal
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#0D0D0D',
  },
  headerTitle: {
    color: '#00FF66',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  tokenText: {
    color: '#00FF66',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 20,
  },
  listContainer: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: '#121212',
    borderRadius: 6,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemDesc: {
    color: '#777',
    fontSize: 11,
    marginTop: 2,
  },
  buyButton: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#00FF66',
  },
  buyButtonText: {
    color: '#00FF66',
    fontWeight: 'bold',
    fontSize: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 16,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  backText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
});