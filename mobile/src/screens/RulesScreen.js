import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const RULES = [
  ['01', 'Choisir un actif', 'Sélectionnez un actif dans le carnet pour voir son prix en temps réel.'],
  ['02', 'Acheter ou vendre', 'Un achat ou une vente est envoyé au carnet d’ordres. Le prix évolue avec la pression du marché.'],
  ['03', 'Surveiller The Wire', 'Les rumeurs peuvent annoncer un pump ou un crash. Toutes ne disent pas la vérité.'],
  ['04', 'Protéger son capital', 'Votre solde virtuel est limité. Évitez de tout miser sur une seule position.'],
  ['05', 'Dominer le syndicat', 'Le classement compare les fortunes. Les Jetons Noirs servent aux éléments de statut et à la boutique.'],
];

export default function RulesScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.kicker}>// PROTOCOLE D’INITIATION</Text>
          <Text style={styles.title}>RÈGLES DU{ '\n' }MARCHÉ</Text>
          <Text style={styles.subtitle}>Apprenez vite. Le marché, lui, n’attend personne.</Text>
        </View>

        {RULES.map(([number, title, description]) => (
          <View key={number} style={styles.ruleCard}>
            <Text style={styles.number}>{number}</Text>
            <View style={styles.ruleBody}>
              <Text style={styles.ruleTitle}>{title}</Text>
              <Text style={styles.ruleText}>{description}</Text>
            </View>
          </View>
        ))}

        <View style={styles.warning}>
          <Text style={styles.warningTitle}>AVERTISSEMENT</Text>
          <Text style={styles.warningText}>Les cours bougent même quand vous êtes absent. Faites confiance aux données, jamais aux promesses.</Text>
        </View>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← RETOUR AU MENU</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090909' },
  content: { padding: 22, paddingBottom: 34 },
  header: { marginBottom: 24, marginTop: 16 },
  kicker: { color: '#00FF66', fontSize: 10, letterSpacing: 1.2, marginBottom: 12 },
  title: { color: '#F4F4F4', fontSize: 34, lineHeight: 35, fontWeight: '900', letterSpacing: 2 },
  subtitle: { color: '#666', fontSize: 12, lineHeight: 18, marginTop: 13 },
  ruleCard: { flexDirection: 'row', backgroundColor: '#121212', borderWidth: 1, borderColor: '#292929', borderRadius: 6, padding: 14, marginBottom: 10 },
  number: { color: '#00FF66', fontSize: 13, fontWeight: '900', width: 34 },
  ruleBody: { flex: 1 },
  ruleTitle: { color: '#FFF', fontSize: 14, fontWeight: '800', marginBottom: 5 },
  ruleText: { color: '#888', fontSize: 11, lineHeight: 17 },
  warning: { borderLeftWidth: 3, borderLeftColor: '#FF5555', backgroundColor: '#171010', padding: 14, marginTop: 10, marginBottom: 24 },
  warningTitle: { color: '#FF5555', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 6 },
  warningText: { color: '#AAA', fontSize: 11, lineHeight: 17 },
  backButton: { borderWidth: 1, borderColor: '#333', borderRadius: 6, paddingVertical: 14, alignItems: 'center' },
  backText: { color: '#AAA', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
});
