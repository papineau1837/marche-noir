import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../services/supabase';
import { useNavigation } from '@react-navigation/native';

export default function LeaderboardScreen({ session }) {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    fetchLeaderboard();

    const channel = supabase
      .channel(`leaderboard-${session?.user?.id || 'public'}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        fetchLeaderboard
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, wallet_balance, black_tokens')
        .order('wallet_balance', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRankings(data || []);
    } catch (error) {
      console.error('Erreur leaderboard:', error);
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
        <Text style={styles.headerTitle}>// CLASSEMENT DU SYNDICAT</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← RETOUR</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rankings}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listContainer}
        ListFooterComponent={(
          <TouchableOpacity style={styles.bottomBackButton} onPress={() => navigation.navigate('Menu')}>
            <Text style={styles.bottomBackText}>← RETOUR AU MENU</Text>
          </TouchableOpacity>
        )}
        renderItem={({ item, index }) => {
          const isTopThree = index < 3;
          const isCurrentUser = session?.user?.id && item.username === session.user.email?.split('@')[0];

          return (
            <View style={[styles.rankCard, isTopThree && styles.topRankCard, isCurrentUser && styles.currentRankCard]}>
              <View style={styles.rankInfo}>
                <Text style={[styles.rankNumber, isTopThree && styles.topRankNumber]}>#{index + 1}</Text>
                <Text style={styles.agentName}>{item.username || 'Anonyme'}</Text>
              </View>
              <View style={styles.wealthContainer}>
                <Text style={styles.wealthText}>{parseFloat(item.wallet_balance || 0).toFixed(0)} $</Text>
                <Text style={styles.tokenText}>{item.black_tokens || 0} 🪙</Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    paddingTop: 46,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#0D0D0D',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#00FF66',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  backBtn: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  rankCard: {
    backgroundColor: '#121212',
    borderRadius: 6,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  topRankCard: {
    borderColor: '#00FF66',
    backgroundColor: '#141c14',
  },
  currentRankCard: {
    borderColor: '#FF3333',
    borderWidth: 2,
  },
  rankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankNumber: {
    color: '#777',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 12,
    width: 30,
  },
  topRankNumber: {
    color: '#00FF66',
  },
  agentName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  wealthContainer: {
    alignItems: 'flex-end',
  },
  wealthText: {
    color: '#00FF66',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tokenText: {
    color: '#888',
    fontSize: 10,
    marginTop: 2,
  },
  bottomBackButton: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  bottomBackText: {
    color: '#AAA',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
