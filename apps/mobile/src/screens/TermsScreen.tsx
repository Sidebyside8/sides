import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

export default function TermsScreen({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <LinearGradient colors={['#B8D4E8', '#E8C4A0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.subtitle}>Please read and accept our terms to continue</Text>
        <ScrollView style={styles.scrollBox} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.body}>By creating an account and using Syde, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the app.</Text>

          <Text style={styles.sectionTitle}>2. Eligibility</Text>
          <Text style={styles.body}>You must be at least 18 years of age to use Syde. By using this app, you represent and warrant that you are 18 years of age or older. We reserve the right to terminate your account if we discover you are under 18.</Text>

          <Text style={styles.sectionTitle}>3. User Conduct</Text>
          <Text style={styles.body}>You agree not to use Syde to:{'\n'}• Harass, abuse, or harm other users{'\n'}• Post false, misleading, or deceptive content{'\n'}• Share explicit content without consent{'\n'}• Impersonate another person{'\n'}• Violate any applicable laws or regulations</Text>

          <Text style={styles.sectionTitle}>4. Privacy Policy</Text>
          <Text style={styles.body}>Your privacy is important to us. We collect and use your information to provide and improve our services. We do not sell your personal information to third parties. Your data is stored securely and handled in accordance with applicable privacy laws.</Text>

          <Text style={styles.sectionTitle}>5. Content</Text>
          <Text style={styles.body}>You are responsible for all content you post on Syde. By posting content, you grant Syde a non-exclusive license to use, display, and distribute that content within the app. You must not post content that is illegal, offensive, or violates the rights of others.</Text>

          <Text style={styles.sectionTitle}>6. Safety</Text>
          <Text style={styles.body}>Syde is committed to creating a safe environment for all users. We encourage you to report any inappropriate behavior or content. While we take reasonable precautions, we cannot guarantee the conduct of other users. Please exercise caution when meeting people you have connected with online.</Text>

          <Text style={styles.sectionTitle}>7. Account Termination</Text>
          <Text style={styles.body}>We reserve the right to suspend or terminate your account at any time for violations of these terms or for any other reason at our sole discretion. You may also delete your account at any time.</Text>

          <Text style={styles.sectionTitle}>8. Disclaimer</Text>
          <Text style={styles.body}>Syde is provided "as is" without warranties of any kind. We are not responsible for any damages arising from your use of the app or interactions with other users.</Text>

          <Text style={styles.sectionTitle}>9. Changes to Terms</Text>
          <Text style={styles.body}>We may update these terms from time to time. Continued use of Syde after changes constitutes acceptance of the new terms.</Text>

          <Text style={styles.sectionTitle}>10. Contact</Text>
          <Text style={styles.body}>If you have any questions about these terms, please contact us through the app.</Text>
        </ScrollView>

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
            <Text style={styles.acceptText}>I Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 24, paddingBottom: 24 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1a2a3a', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#556677', marginBottom: 16 },
  scrollBox: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  scrollContent: { padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1a2a3a', marginTop: 16, marginBottom: 6 },
  body: { fontSize: 13, color: '#334455', lineHeight: 20 },
  buttons: { gap: 10 },
  acceptButton: {
    backgroundColor: '#2196F3', borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  acceptText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  declineButton: {
    backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 12,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
  },
  declineText: { color: '#556677', fontSize: 16 },
})
