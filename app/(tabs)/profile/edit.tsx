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
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';
import { Avatar } from '@/components/ui/Avatar';

export default function EditProfileScreen() {
  const { t } = useTranslation('profile');
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
      Alert.alert(t('edit.invalidWeightTitle'), t('edit.invalidWeightMsg'));
      return;
    }
    if (form.height_cm !== '' && (isNaN(height!) || height! <= 0)) {
      Alert.alert(t('edit.invalidHeightTitle'), t('edit.invalidHeightMsg'));
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
      Alert.alert(t('edit.saveErrorTitle'), error);
    } else {
      router.back();
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="p-1 mr-2"
          style={({ pressed }) => pressed && { opacity: 0.5 }}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </Pressable>
        <Text className="font-heading text-2xl text-primary tracking-[3px] flex-1">
          {t('edit.title')}
        </Text>
        <View className="w-[30px]" />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View className="items-center mb-7 relative self-center">
            <Avatar name={displayName} userId={user?.id ?? displayName} size="xl" />
            <View className="absolute bottom-0 right-0 w-7 h-7 rounded-full items-center justify-center border-2 border-base bg-accent">
              <Ionicons name="camera" size={12} color={Colors.primary} />
            </View>
          </View>

          {/* Fields */}
          <Field
            label={t('edit.fullName')}
            placeholder={t('edit.fullNamePlaceholder')}
            value={form.full_name}
            onChangeText={(v) => set('full_name', v)}
          />
          <Field
            label={t('edit.username')}
            placeholder={t('edit.usernamePlaceholder')}
            value={form.username}
            onChangeText={(v) => set('username', v)}
            autoCapitalize="none"
          />
          <Field
            label={t('edit.bio')}
            placeholder={t('edit.bioPlaceholder')}
            value={form.bio}
            onChangeText={(v) => set('bio', v)}
            multiline
          />
          <Field
            label={t('edit.motto')}
            placeholder={t('edit.mottoPlaceholder')}
            value={form.quote}
            onChangeText={(v) => set('quote', v)}
          />
          <Field
            label={t('edit.gym')}
            placeholder={t('edit.gymPlaceholder')}
            value={form.gym}
            onChangeText={(v) => set('gym', v)}
          />
          <Field
            label={t('edit.weight')}
            placeholder="76"
            value={form.weight_kg}
            onChangeText={(v) => set('weight_kg', v)}
            keyboardType="decimal-pad"
          />
          <Field
            label={t('edit.height')}
            placeholder="182"
            value={form.height_cm}
            onChangeText={(v) => set('height_cm', v)}
            keyboardType="decimal-pad"
          />
          <Field
            label={t('edit.goal')}
            placeholder={t('edit.goalPlaceholder')}
            value={form.goal}
            onChangeText={(v) => set('goal', v)}
          />

          <Pressable
            className="bg-accent rounded-2xl h-[52px] items-center justify-center mt-2"
            style={({ pressed }) => pressed && { opacity: 0.8 }}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <Text className="font-heading text-base text-primary tracking-[2px]">
                {t('edit.save')}
              </Text>
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
    <View className="mb-4">
      <Text className="font-heading text-[11px] tracking-[2px] text-[#505050] mb-2">{label}</Text>
      <TextInput
        className={`bg-elevated rounded-xl px-4 py-3.5 font-sans text-[15px] text-primary border border-default ${
          multiline ? 'min-h-[80px]' : 'min-h-[50px]'
        }`}
        style={multiline ? { textAlignVertical: 'top' } : undefined}
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
  content: {
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
});
