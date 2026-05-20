import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';
import { Avatar } from '@/components/ui/Avatar';

export default function EditProfileScreen() {
  const { user } = useAuthStore();
  const { profile, saving, updateProfile } = useProfileStore();

  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    username: profile?.username ?? '',
    bio: profile?.bio ?? '',
    quote: profile?.quote ?? '',
    gym: profile?.gym ?? '',
    weight_kg: profile?.weight_kg != null ? String(profile.weight_kg) : '',
    height_cm: profile?.height_cm != null ? String(profile.height_cm) : '',
    goal: profile?.goal ?? '',
  });

  const displayName = form.full_name || user?.email?.split('@')[0] || 'Athlete';

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!user?.id) return;

    const weight = form.weight_kg !== '' ? Number(form.weight_kg) : null;
    const height = form.height_cm !== '' ? Number(form.height_cm) : null;

    if (form.weight_kg !== '' && (isNaN(weight!) || weight! <= 0)) {
      Alert.alert('Invalid weight', 'Please enter a valid weight in kg.');
      return;
    }
    if (form.height_cm !== '' && (isNaN(height!) || height! <= 0)) {
      Alert.alert('Invalid height', 'Please enter a valid height in cm.');
      return;
    }

    const { error } = await updateProfile(user.id, {
      full_name: form.full_name.trim() || null,
      username: form.username.trim().replace(/^@/, '') || null,
      bio: form.bio.trim() || null,
      quote: form.quote.trim() || null,
      gym: form.gym.trim() || null,
      weight_kg: weight,
      height_cm: height,
      goal: form.goal.trim() || null,
    });

    if (error) {
      Alert.alert('Could not save', error);
    } else {
      router.back();
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </Pressable>
        <Text style={styles.heading}>EDIT PROFILE</Text>
        <View style={styles.spacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <Avatar name={displayName} userId={user?.id ?? displayName} size="xl" />
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={12} color={Colors.primary} />
            </View>
          </View>

          {/* Fields */}
          <Field
            label="FULL NAME"
            placeholder="Your name"
            value={form.full_name}
            onChangeText={(v) => set('full_name', v)}
          />
          <Field
            label="USERNAME"
            placeholder="@username"
            value={form.username}
            onChangeText={(v) => set('username', v)}
            autoCapitalize="none"
          />
          <Field
            label="BIO"
            placeholder="Tell your story..."
            value={form.bio}
            onChangeText={(v) => set('bio', v)}
            multiline
          />
          <Field
            label="YOUR MOTTO"
            placeholder="E.g. No pain, no gain"
            value={form.quote}
            onChangeText={(v) => set('quote', v)}
          />
          <Field
            label="GYM"
            placeholder="Your gym"
            value={form.gym}
            onChangeText={(v) => set('gym', v)}
          />
          <Field
            label="WEIGHT (kg)"
            placeholder="76"
            value={form.weight_kg}
            onChangeText={(v) => set('weight_kg', v)}
            keyboardType="decimal-pad"
          />
          <Field
            label="HEIGHT (cm)"
            placeholder="182"
            value={form.height_cm}
            onChangeText={(v) => set('height_cm', v)}
            keyboardType="decimal-pad"
          />
          <Field
            label="GOAL"
            placeholder="E.g. Muscle gain"
            value={form.goal}
            onChangeText={(v) => set('goal', v)}
          />

          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <Text style={styles.saveBtnText}>SAVE CHANGES</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences';
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.hint}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  heading: {
    fontFamily: Fonts.display,
    fontSize: FontSizes['2xl'],
    color: Colors.primary,
    letterSpacing: 3,
    flex: 1,
  },
  spacer: {
    width: 30,
  },
  kav: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 96,
  },

  // Avatar
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 28,
    position: 'relative',
    alignSelf: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.base,
  },

  // Fields
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 2,
    color: '#505050',
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.elevated,
    borderRadius: Radius.input,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.primary,
    minHeight: 50,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Save button
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.button,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.base,
    color: Colors.primary,
    letterSpacing: 2,
  },
});
