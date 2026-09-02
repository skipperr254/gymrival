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
import { useRef, useState } from 'react';
import { Camera } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';
import { Avatar } from '@/components/ui/Avatar';
import { DetailHeader } from '@/components/ui/DetailHeader';
import {
  pickAvatarFromLibrary,
  takeAvatarPhoto,
  type PickAvatarResult,
} from '@/lib/media/pickAvatarAsset';
import type { Profile } from '@/types/user';

function buildFormFromProfile(profile: Profile | null) {
  return {
    full_name: profile?.full_name ?? '',
    username: profile?.username ?? '',
    bio: profile?.bio ?? '',
    quote: profile?.quote ?? '',
    gym: profile?.gym ?? '',
    weight_kg: profile?.weight_kg != null ? String(profile.weight_kg) : '',
    height_cm: profile?.height_cm != null ? String(profile.height_cm) : '',
    goal: profile?.goal ?? '',
  };
}

export default function EditProfileScreen() {
  const { t } = useTranslation('profile');
  const { user } = useAuthStore();
  const { profile, saving, updateProfile, avatarUploading, uploadAvatar, removeAvatar } = useProfileStore();

  const [form, setForm] = useState(() => buildFormFromProfile(profile));
  // Snapshot of what the form looked like when this screen opened. handleSave
  // diffs against this so it only sends fields the user actually touched —
  // otherwise every save re-sent every field from this device's (possibly
  // stale) copy, silently overwriting any change made elsewhere (another
  // device, another session) to a field the user on this screen never
  // touched. See audits/02-data-integrity.md finding #20.
  const initialFormRef = useRef(form);

  const displayName = form.full_name || user?.email?.split('@')[0] || 'Athlete';

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!user?.id) return;

    const weight = form.weight_kg !== '' ? Number(form.weight_kg) : null;
    const height = form.height_cm !== '' ? Number(form.height_cm) : null;

    // Upper bounds are plausibility checks, not precision limits — a typo
    // like an extra digit (e.g. "7600" instead of "76") previously passed
    // validation and would render as a nonsensical value in the profile card.
    if (form.weight_kg !== '' && (isNaN(weight!) || weight! <= 0 || weight! > 500)) {
      Alert.alert(t('edit.invalidWeightTitle'), t('edit.invalidWeightMsg'));
      return;
    }
    if (form.height_cm !== '' && (isNaN(height!) || height! <= 0 || height! > 300)) {
      Alert.alert(t('edit.invalidHeightTitle'), t('edit.invalidHeightMsg'));
      return;
    }

    const initial = initialFormRef.current;
    const updates: Partial<{
      full_name: string | null;
      username: string | null;
      bio: string | null;
      quote: string | null;
      gym: string | null;
      weight_kg: number | null;
      height_cm: number | null;
      goal: string | null;
    }> = {};

    if (form.full_name !== initial.full_name) updates.full_name = form.full_name.trim() || null;
    if (form.username !== initial.username) updates.username = form.username.trim().replace(/^@/, '') || null;
    if (form.bio !== initial.bio) updates.bio = form.bio.trim() || null;
    if (form.quote !== initial.quote) updates.quote = form.quote.trim() || null;
    if (form.gym !== initial.gym) updates.gym = form.gym.trim() || null;
    if (form.weight_kg !== initial.weight_kg) updates.weight_kg = weight;
    if (form.height_cm !== initial.height_cm) updates.height_cm = height;
    if (form.goal !== initial.goal) updates.goal = form.goal.trim() || null;

    if (Object.keys(updates).length === 0) {
      router.back();
      return;
    }

    const { error, code } = await updateProfile(user.id, updates);

    if (error) {
      // Map known Postgres error codes to friendly, translated copy instead
      // of showing the raw DB error text (e.g. a unique-constraint message
      // naming the SQL constraint) directly to the user.
      const message =
        code === '23505' ? t('edit.usernameTakenError') : t('edit.saveErrorGeneric');
      Alert.alert(t('edit.saveErrorTitle'), message);
    } else {
      router.back();
    }
  }

  async function handlePickResult(result: PickAvatarResult) {
    if (result.status === 'permission_denied') {
      Alert.alert(t('edit.photoPermissionTitle'), t('edit.photoPermissionMsg'));
      return;
    }
    if (result.status === 'canceled' || !user?.id) return;

    const { error } = await uploadAvatar(user.id, result.asset.uri, result.asset.mimeType);
    if (error) Alert.alert(t('edit.uploadErrorTitle'), t('edit.uploadErrorMsg'));
  }

  function handleChangePhoto() {
    const options = [
      { text: t('edit.takePhoto'), onPress: () => takeAvatarPhoto().then(handlePickResult) },
      { text: t('edit.chooseFromLibrary'), onPress: () => pickAvatarFromLibrary().then(handlePickResult) },
      ...(profile?.avatar_url
        ? [{
            text: t('edit.removePhoto'),
            style: 'destructive' as const,
            onPress: () => user?.id && removeAvatar(user.id),
          }]
        : []),
      { text: t('common:cancel'), style: 'cancel' as const },
    ];
    Alert.alert(t('edit.changePhotoTitle'), undefined, options);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      <DetailHeader title={t('edit.title')} />

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
          <Pressable
            className="items-center mb-7 relative self-center"
            onPress={handleChangePhoto}
            disabled={avatarUploading}
            style={({ pressed }) => pressed && { opacity: 0.8 }}
          >
            <Avatar name={displayName} userId={user?.id ?? displayName} avatarUrl={profile?.avatar_url} size="xl" />
            {avatarUploading && (
              <View
                className="absolute items-center justify-center rounded-full bg-black/50"
                style={{ width: 72, height: 72 }}
              >
                <ActivityIndicator color={Colors.primary} />
              </View>
            )}
            <View className="absolute bottom-0 right-0 w-7 h-7 rounded-full items-center justify-center border-2 border-base bg-accent">
              <Camera size={12} color={Colors.primary} />
            </View>
          </Pressable>

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
