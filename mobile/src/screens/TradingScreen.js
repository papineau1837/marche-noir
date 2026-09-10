import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, ScrollView, Animated, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../services/supabase';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TradingScreen({ session }) {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [rumors, setRumors] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [userTokens, setUserTokens] = useState(0);
  const navigation = useNavigation();

  // Animation bounce for CTA buttons
  const bounceAnim = new Animated.Value(0);

  useEffect(() => {
    loadData();
    setupListeners();
    
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const channel = supabase
    .channel('public:assets')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'assets' },
      (payload) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        loadAssets();
      }
    )
    .subscribe();

  const loadData = async () => {
    try {
      const assetsResp = await supabase.table("assets").select("*").execute();
      setAssets(assetsResp.data || []);
      
      const profileResp = await supabase.table("profiles").select("wallet_balance, black_tokens").eq("id", session.user.id).single().execute();
      if (profileResp.data) {
        setWalletBalance(profileResp.data.wallet_balance);
        setUserTokens(profileResp.data.black_tokens || 0);
      }
      
      const rumorsResp = await supabase.table("rumors").select("*").order("created_at", { ascending: false }).limit(8).execute();
      setRumors(rumorsResp.data || []);
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement:', error);
      setLoading(false);
    }
  };

  const setupListeners = () => {
    const rumorsChannel = supabase
      .channel('public:rumors')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rumors' },
        (payload) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          loadData();
        }
      )
      .subscribe();
  };

  const handleBuy = async (assetId, price, quantity) => {
    const totalCost = price * quantity;
    if (walletBalance < totalCost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Fonds insuffisants', 'Vous n\'avez pas assez de Jetons Noirs.');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.parallel([
      Animated.timing(bounceAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    
    const orderData = {
      user_id: session.user.id,
      asset_id: assetId,
      order_type: "BUY",
      price: price,
      quantity: quantity,
      status: "PENDING"
    };
    
    const resp = await supabase.table("order_book").insert(orderData).execute();
    
    const newBalance = walletBalance - totalCost;
    await supabase.table("profiles").update({ wallet_balance: newBalance }).eq("id", session.user.id).execute();
    setWalletBalance(newBalance);
    
    const asset = assets.find(a => a.id === assetId);
    if (asset) {
      const newPrice = Math.round(asset.current_price * 1.01 * 100) / 100;
      await supabase.table("assets").update({ current_price: newPrice }).eq("id", assetId).execute();
      loadAssets();
    }
    
    Alert.alert('Ordre exécuté', 'Achat de ' + quantity + ' unités à ' + price + ' $');
  };

  const handleSell = async (assetId, price, quantity) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Vente', 'Fonctionnalité de vente en cours...');
  };

  const pulseAnimation = () => {
    bounceAnim.value = 0;
    Animated.timing(bounceAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <Animated.View style={[styles.loader, { transform: [{ scale: bounceAnim }] }]} color="#00FF66">
          <Text style={styles.loaderText}>CHARGEMENT DU CARNET...</Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Floating action button animation
  pulseAnimation();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with animated dot indicator */}
      <View style={styles.header}>
        <View style={[styles.liveIndicator, { animation: 'pulse 2s infinite' }]}>
          <View style={styles.pulsingDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        
        <View style={styles.userPanel}>
          <Text style={styles.walletLabel}>WALLET</Text>
          <Text style={styles.walletValue}>{walletBalance} $</Text>
          <Text style={styles.tokenLabel}>TOKENS</Text>
          <Text style={styles.tokenValue}>{userTokens} 🪙</Text>
        </View>
      </View>
      
      {/* Rumors Feed */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>// THE WIRE</Text>
        {rumors.length === 0 ? (
          <Text style={styles.emptyState}>Aucune rumeur pour l'instant. Soyez le premier à en propager une.</Text>
        ) : (
          <FlatList
            data={rumors}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.rumorList}
            renderItem={({ item }) => (
              <Animated.View style={[styles.rumorCard, { opacity: rumoredIndex > 0 ? 1 : 0.5 }]} >
                <View style={styles.rumorContent}>
                  <Text style={styles.rumorText}>{item.content}</Text>
                  <Text style={[styles.impactBadge, { color: item.impact_score > 0 ? '#00FF66' : '#FF3333' }]}>
                    {item.impact_score > 0 ? '↑ PUMP POTENTIEL' : '↓ CRASH IMMINENT'}
                  </Text>
                </View>
              </Animated.View>
            )}
          />
        )}
      </View>
      
      {/* Assets Carousel/Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CARNET D'ORDRES</Text>
        <FlatList
          horizontal
          data={assets}
          keyExtractor={(item, index) => item.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.assetItem, { transform: [{ scale: bounceAnim > 0 ? 1.05 : 1 }] }]}
              onPress={() => navigation.navigate('Details', { assetId: item.id })}
            >
              <View style={styles.assetPreview}>
                <Text style={styles.assetName}>{item.name}</Text>
                <Text style={styles.assetPrice}>{item.current_price} $</Text>
              </View>
              <View style={styles.assetChevron}>
                <Text style={styles.chevron}>→</Text>
              </View>
            </TouchableOpacity>
          )}
          deceleration=factor={0.99}
        />
      </View>
      
      {/* Action Buttons Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={[styles.buyButton, { transform: [{ scale: bounceAnim }] }]} onPress={() => handleBuy()}>
          <Text style={styles.buyButtonText}>VALIDER ACHAT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sellButton} onPress={() => handleSell()}>
          <Text style={styles.sellButtonText}>EXÉCUTER VENTE</Text>
        </TouchableOpacity>
      </View>
      
      {/* Navigation Tabs at bottom */}
      <View style={styles.tabBar}>
        <TouchableOpacity onPress={() => navigation.navigate('DarknetStore')}>
          <View style={styles.tabIcon}>
            <Text style={styles.tabIconText}>🛒</Text>
          </View>
          <Text style={styles.tabLabel}>Boutique</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')}>
          <View style={styles.tabIcon}>
            <Text style={styles.tabIconText}>👑</Text>
          </View>
          <Text style={styles.tabLabel}>Classement</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    paddingBottom: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  loaderText: {
    color: '#00FF66',
    fontSize: 12,
    marginTop: 8,
    fontWeight: 'bold',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#0D0D0D',
    paddingBottom: 8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 6,
    borderRadius: 20,
    marginRight: 12,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FF66',
    marginRight: 6,
    animation: 'pulse 2s infinite',
  },
  liveText: {
    color: '#00FF66',
    fontSize: 9,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  userPanel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletLabel: {
    color: '#666',
    fontSize: 8,
    marginRight: 4,
  },
  walletValue: {
    color: '#00FF66',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 20,
  },
  tokenLabel: {
    color: '#666',
    fontSize: 8,
    marginRight: 4,
  },
  tokenValue: {
    color: '#888',
    fontSize: 10,
  },
  section: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#0D0D0D',
  },
  sectionTitle: {
    color: '#00FF66',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  rumorList: {
    maxHeight: 120,
  },
  rumorCard: {
    backgroundColor: '#141414',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  rumorText: {
    color: '#CCC',
    fontSize: 10,
    fontFamily: 'monospace',
    lineHeight: 1.3,
  },
  impactBadge: {
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 2,
  },
  assetsSection: {
    paddingBottom: 8,
  },
  assetList: {
    maxHeight: 350,
  },
  assetItem: {
    width: SCREEN_WIDTH * 0.4,
    marginRight: 8,
    marginBottom: 8,
  },
  assetPreview: {
    backgroundColor: '#121212',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    height: 80,
  },
  assetName: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  assetPrice: {
    color: '#00FF66',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  assetChevron: {
    alignSelf: 'flex-end',
  },
  chevron: {
    color: '#555',
    fontSize: 14,
  },
  actionBar: {
    padding: 12,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#222',
    justifyContent: 'center',
  },
  buyButton: {
    backgroundColor: '#00FF66',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginRight: 12,
    width: SCREEN_WIDTH * 0.4,
  },
  buyButtonText: {
    color: '#000',
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sellButton: {
    backgroundColor: '#2A2A2A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#00FF66',
    width: SCREEN_WIDTH * 0.4,
  },
  sellButtonText: {
    color: '#00FF66',
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tabBar: {
    padding: 8,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#222',
    justifyContent: 'space-around',
  },
  tabIcon: {
    width: 24,
    height: 24,
    marginBottom: 4,
  },
  tabIconText: {
    color: '#00FF66',
    fontSize: 20,
  },
  tabLabel: {
    color: '#666',
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  emptyState: {
    color: '#777',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
});