import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../services/supabase';

export default function WireFeed({ selectedAssetId }) {
  const [rumors, setRumors] = useState([]);
  const [rumorText, setRumorText] = useState('');
  const [impact, setImpact] = useState(0.5);

  useEffect(() => {
    fetchRumors();

    const channel = supabase
      .channel('public:rumors')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rumors' },
        (payload) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setRumors((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRumors = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/rumors');
      const data = await response.json();
      if (data.rumors) setRumors(data.rumors);
    } catch (error) {
      console.error('Erreur chargement rumeurs', error);
    }
  };

  const sendRumor = async () => {
    if (!rumorText.trim() || !selectedAssetId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      await fetch('http://localhost:8000/api/rumors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_id: 'user-test-uuid',
          asset_id: selectedAssetId,
          content: rumorText,
          impact_score: impact,
        }),
      });
      setRumorText('');
    } catch (error) {
      console.error('Erreur envoi rumeur', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>// THE WIRE (CANAL ANONYME)</Text>

      <FlatList
        data={rumors}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={({ item }) => (
          <View style={styles.rumorItem}>
            <Text style={styles.rumorText}>&gt; {item.content}</Text>
            <Text style={[styles.impactBadge, { color: item.impact_score > 0 ? '#00FF66' : '#FF3333' }]}>
              {item.impact_score > 0 ? 'PUMP POTENTIEL' : 'CRASH IMMINENT'}
            </Text>
          </View>
        )}
        style={styles.list}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Propager une rumeur (ex: Le cartel liquide ses stocks...)"
          placeholderTextColor="#555"
          value={rumorText}
          onChangeText={setRumorText}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendRumor}>
          <Text style={styles.sendButtonText}>INJECTER</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  title: {
    color: '#FF3333',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1.2,
  },
  list: {
    maxHeight: 150,
    marginBottom: 10,
  },
  rumorItem: {
    backgroundColor: '#141414',
    padding: 8,
    borderRadius: 4,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#444',
  },
  rumorText: {
    color: '#CCC',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  impactBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    color: '#FFF',
    padding: 8,
    borderRadius: 4,
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  sendButton: {
    backgroundColor: '#FF3333',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 6,
  },
  sendButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 10,
  },
});
