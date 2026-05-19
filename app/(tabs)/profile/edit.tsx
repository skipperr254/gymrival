import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';

const FIELDS = [
  { label: 'FULL NAME', placeholder: 'Your name', value: 'Athlete' },
  { label: 'USERNAME', placeholder: '@username', value: '@athlete' },
  { label: 'BIO', placeholder: 'Tell your story...', value: 'On the way to my best self 💪' },
  { label: 'GYM', placeholder: 'Your gym', value: 'Basic-Fit Amsterdam' },
];

export default function EditProfileScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </Pressable>
        <Text style={styles.heading}>EDIT PROFILE</Text>
        <View style={styles.spacer} />
      </View>

      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Avatar edit */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>AT</Text>
            </View>
            <Pressable style={({ pressed }) => [styles.avatarEditBtn, pressed && { opacity: 0.7 }]}>
              <Ionicons name="camera" size={14} color={Colors.primary} />
            </Pressable>
          </View>

          {/* Fields */}
          {FIELDS.map((field) => (
            <View key={field.label} style={styles.field}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <TextInput
                style={styles.input}
                defaultValue={field.value}
                placeholder={field.placeholder}
                placeholderTextColor={Colors.hint}
                editable={false}
              />
            </View>
          ))}

          <Pressable style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }]}>
            <Text style={styles.saveBtnText}>SAVE CHANGES</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.base },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  back: { padding: 4, marginRight: 8 },
  heading: { fontFamily: Fonts.display, fontSize: 24, color: Colors.primary, letterSpacing: 3, flex: 1 },
  spacer: { width: 30 },
  kav: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 96 },
  avatarContainer: { alignItems: 'center', marginBottom: 28, position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.accentDark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Fonts.display, fontSize: 24, color: Colors.primary },
  avatarEditBtn: { position: 'absolute', bottom: 0, right: '35%', width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  field: { marginBottom: 16 },
  fieldLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 2, color: Colors.muted, marginBottom: 8 },
  input: { backgroundColor: Colors.elevated, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontFamily: Fonts.body, fontSize: 15, color: Colors.primary, minHeight: 50 },
  saveBtn: { backgroundColor: Colors.accent, borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText: { fontFamily: Fonts.display, fontSize: 16, color: Colors.primary, letterSpacing: 2 },
});
