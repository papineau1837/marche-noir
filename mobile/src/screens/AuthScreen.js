</TextInput>
      <TextInput
        style={styles.input}
        placeholder="Code d'accès (Mot de passe)"
        placeholderTextColor="#555"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleAuth}>
        <Text style={styles.buttonText}>{isRegistering ? 'CRÉER UN COMPTE' : 'SE CONNECTER'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          Haptics.selectionAsync();
          setIsRegistering(!isRegistering);
        }}
        style={styles.switchButton}
      >
        <Text style={styles.switchText}>
          {isRegistering ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? S’enrôler'}
        </Text>
      </TouchableOpacity>
    </View>
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