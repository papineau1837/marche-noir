import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../services/supabase';
import { signOut } from '../services/auth';

const API_BASE_URL = 'https://statiquestudio-github-io.onrender.com';

export default function TradingScreen({ session }) {
  const userId = session?.user?.id || null;
  const [assets, setAssets] = useState([]);
  const [rumors, setRumors] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [userTokens, setUserTokens] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [assetsResult, rumorsResult, profileResult] = await Promise.all([
          supabase.from('assets').select('*').order('name'),
          supabase
            .from('rumors')
            .select('id, content, impact_score, created_at')
            .order('created_at', { ascending: false })
            .limit(8),
          userId
            ? supabase
                .from('profiles')
                .select('wallet_balance, black_tokens')
                .eq('id', userId)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);

        if (assetsResult.error) throw assetsResult.error;
        if (rumorsResult.error) throw rumorsResult.error;
        if (mounted) {
          setAssets(assetsResult.data || []);
          setRumors(rumorsResult.data || []);
          if (assetsResult.data?.length) setSelectedAsset(assetsResult.data[0]);
          if (profileResult.data) {
            setWalletBalance(Number(profileResult.data.wallet_balance || 0));
            setUserTokens(Number(profileResult.data.black_tokens || 0));
          }
        }
      } catch (error) {
        console.error('Erreur de chargement du terminal:', error);
        if (mounted) Alert.alert('Connexion impossible', 'Le marché est temporairement indisponible.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    const assetsChannel = supabase
      .channel(`assets-${userId || 'guest'}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assets' }, (payload) => {
        setAssets((current) => current.map((asset) => (
          asset.id === payload.new.id ? { ...asset, ...payload.new } : asset
        )));
      })
      .subscribe();

    const rumorsChannel = supabase
      .channel(`rumors-${userId || 'guest'}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rumors' }, (payload) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setRumors((current) => [payload.new, ...current].slice(0, 8));
      })
      .subscribe();

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulseAnimation.start();

    return () => {
      mounted = false;
      pulseAnimation.stop();
      supabase.removeChannel(assetsChannel);
      supabase.removeChannel(rumorsChannel);
    };
  }, [pulse, userId]);

  const placeOrder = async (orderType) => {
    if (!selectedAsset || actionLoading) return;
    if (!userId || !session?.access_token) {
      Alert.alert('Mode test', 'Connectez-vous pour exécuter un ordre réel.');
      return;
    }

    setActionLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          asset_id: selectedAsset.id,
          order_type: orderType,
          price: Number(selectedAsset.current_price),
          quantity: 1,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Ordre refusé.');

      Alert.alert('Ordre exécuté', `${orderType === 'BUY' ? 'Achat' : 'Vente'} enregistré.`);
    } catch (error) {
      Alert.alert('Ordre impossible', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de fermer la session.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#00FF66" />
        <Text style={styles.loadingText}>CONNEXION AU MARCHÉ...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <View style={styles.liveRow}>
              <Animated.View style={[styles.liveDot, { transform: [{ scale: pulse }] }]} />
              <Text style={styles.liveText}>LIVE MARKET</Text>
            </View>
            <Text style={styles.title}>MARCHÉ NOIR</Text>
          </View>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>{userId ? 'QUITTER' : 'MODE TEST'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.walletCard}>
          <View>
            <Text style={styles.mutedLabel}>SOLDE VIRTUEL</Text>
            <Text style={styles.walletValue}>{walletBalance.toFixed(2)} $</Text>
          </View>
          <View style={styles.tokenBox}>
            <Text style={styles.mutedLabel}>JETONS NOIRS</Text>
            <Text style={styles.tokenValue}>{userTokens} 🪙</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>// THE WIRE</Text>
          <Text style={styles.sectionMeta}>{rumors.length} signaux</Text>
        </View>
        {rumors.length ? (
          <FlatList
            data={rumors}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => item.id || String(index)}
            renderItem={({ item }) => (
              <View style={styles.rumorCard}>
                <Text style={styles.rumorText}>{item.content}</Text>
                <Text style={[styles.impact, { color: Number(item.impact_score) >= 0 ? '#00FF66' : '#FF5555' }]}>
                  {Number(item.impact_score) >= 0 ? 'PUMP POTENTIEL' : 'CRASH IMMINENT'}
                </Text>
              </View>
            )}
          />
        ) : (
          <Text style={styles.emptyText}>Aucun signal. Le silence est parfois le meilleur indicateur.</Text>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>// ACTIFS</Text>
          <Text style={styles.sectionMeta}>{assets.length} marchés</Text>
        </View>
        {assets.map((asset) => {
          const selected = selectedAsset?.id === asset.id;
          return (
            <TouchableOpacity
              key={asset.id}
              style={[styles.assetCard, selected && styles.selectedAsset]}
              onPress={() => setSelectedAsset(asset)}
              activeOpacity={0.8}
            >
              <View style={styles.assetInfo}>
                <Text style={styles.assetName}>{asset.name}</Text>
                <Text style={styles.assetId}>{String(asset.id).slice(0, 8)}...</Text>
              </View>
              <Text style={styles.assetPrice}>{Number(asset.current_price || 0).toFixed(2)} $</Text>
            </TouchableOpacity>
          );
        })}

        <Text style={styles.selectedLabel}>
          {selectedAsset ? `ACTIF SÉLECTIONNÉ : ${selectedAsset.name}` : 'SÉLECTIONNEZ UN ACTIF'}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.buyButton]}
            onPress={() => placeOrder('BUY')}
            disabled={!selectedAsset || actionLoading}
          >
            <Text style={styles.actionText}>{actionLoading ? '...' : 'ACHETER'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.sellButton]}
            onPress={() => placeOrder('SELL')}
            disabled={!selectedAsset || actionLoading}
          >
            <Text style={[styles.actionText, styles.sellText]}>{actionLoading ? '...' : 'VENDRE'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.menuButton} onPress={() => navigation.navigate('Menu')}>
          <Text style={styles.menuButtonText}>← RETOUR AU MENU</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#00FF66', marginTop: 12, fontSize: 11, letterSpacing: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  liveRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00FF66', marginRight: 7 },
  liveText: { color: '#00FF66', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  title: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  signOutButton: { borderWidth: 1, borderColor: '#333', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 4 },
  signOutText: { color: '#888', fontSize: 10, fontWeight: '700' },
  walletCard: { backgroundColor: '#141414', borderColor: '#252525', borderWidth: 1, borderRadius: 10, padding: 16, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  mutedLabel: { color: '#777', fontSize: 9, letterSpacing: 1 },
  walletValue: { color: '#00FF66', fontSize: 24, fontWeight: '800', marginTop: 5 },
  tokenBox: { alignItems: 'flex-end' },
  tokenValue: { color: '#FFF', fontSize: 16, fontWeight: '700', marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  sectionTitle: { color: '#FF5555', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  sectionMeta: { color: '#555', fontSize: 10 },
  rumorCard: { width: 230, minHeight: 80, backgroundColor: '#151515', borderLeftWidth: 3, borderLeftColor: '#FF5555', borderRadius: 6, padding: 12, marginRight: 8, marginBottom: 24 },
  rumorText: { color: '#DDD', fontSize: 12, lineHeight: 17 },
  impact: { fontSize: 9, fontWeight: '800', marginTop: 9, letterSpacing: 0.6 },
  emptyText: { color: '#666', fontSize: 12, marginBottom: 24 },
  assetCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#121212', borderColor: '#222', borderWidth: 1, borderRadius: 7, padding: 14, marginBottom: 8 },
  selectedAsset: { borderColor: '#00FF66', backgroundColor: '#131B15' },
  assetInfo: { flex: 1, paddingRight: 10 },
  assetName: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  assetId: { color: '#666', fontSize: 9, marginTop: 4 },
  assetPrice: { color: '#00FF66', fontSize: 15, fontWeight: '800' },
  selectedLabel: { color: '#777', fontSize: 10, marginTop: 18, marginBottom: 9 },
  actions: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, borderRadius: 6, paddingVertical: 14, alignItems: 'center' },
  buyButton: { backgroundColor: '#00FF66' },
  sellButton: { borderWidth: 1, borderColor: '#FF5555', backgroundColor: '#171010' },
  actionText: { color: '#000', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  sellText: { color: '#FF5555' },
  menuButton: { borderWidth: 1, borderColor: '#333', borderRadius: 6, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  menuButtonText: { color: '#AAA', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
});
