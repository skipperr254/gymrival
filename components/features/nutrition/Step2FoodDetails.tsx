import { View, Text, TextInput, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, AlertTriangle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import type { Food, MealType } from '@/types/nutrition';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

interface NewFoodFields {
  name: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  servingLabel: string;
  saveToMyFoods: boolean;
}

interface Step2FoodDetailsProps {
  mode: 'new' | 'existing';
  food: Food | null;
  mealType: MealType;
  onChangeMealType: (m: MealType) => void;
  fields: NewFoodFields;
  onChangeFields: (fields: NewFoodFields) => void;
  quantity: string;
  onChangeQuantity: (q: string) => void;
  saving: boolean;
  saveError: string | null;
  canSave: boolean;
  onSave: () => void;
}

function NumberField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View className="flex-1">
      <Text className="font-heading text-[9px] tracking-[2px] text-muted mb-1.5">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={Colors.hint}
        className="font-heading text-xl text-primary bg-base border-[1.5px] border-default rounded-xl px-3 py-2.5"
      />
    </View>
  );
}

export function Step2FoodDetails({
  mode,
  food,
  mealType,
  onChangeMealType,
  fields,
  onChangeFields,
  quantity,
  onChangeQuantity,
  saving,
  saveError,
  canSave,
  onSave,
}: Step2FoodDetailsProps) {
  const { t } = useTranslation('nutrition');
  const qtyNum = parseFloat(quantity) || 0;

  const set = (patch: Partial<NewFoodFields>) => onChangeFields({ ...fields, ...patch });

  return (
    <View>
      {mode === 'existing' && food ? (
        <View className="mb-5">
          <Text className="font-heading text-lg text-primary tracking-[0.5px] mb-3">{food.name}</Text>
          <Text className="font-heading text-[9px] tracking-[2px] text-muted mb-1.5">
            {t('logSheet.servings')}
          </Text>
          <TextInput
            value={quantity}
            onChangeText={onChangeQuantity}
            keyboardType="numeric"
            className="font-heading text-2xl text-primary bg-base border-[1.5px] border-default rounded-xl px-4 py-2.5 mb-3"
          />
          <View className="bg-base rounded-2xl p-3.5">
            <Text className="font-sans text-xs text-secondary">
              {t('logSheet.macroSummary', {
                calories: Math.round(food.calories * qtyNum),
                protein: Math.round(food.protein_g * qtyNum),
                carbs: Math.round(food.carbs_g * qtyNum),
                fat: Math.round(food.fat_g * qtyNum),
              })}
            </Text>
          </View>
        </View>
      ) : (
        <View className="mb-5">
          <Text className="font-heading text-[9px] tracking-[2px] text-muted mb-1.5">
            {t('logSheet.foodName')}
          </Text>
          <TextInput
            value={fields.name}
            onChangeText={(v) => set({ name: v })}
            placeholder={t('logSheet.foodNamePlaceholder')}
            placeholderTextColor={Colors.hint}
            className="font-sans-medium text-base text-primary bg-base border-[1.5px] border-default rounded-xl px-3.5 py-3 mb-3"
          />

          <View className="flex-row gap-2.5 mb-2.5">
            <NumberField label={t('logSheet.calories')} value={fields.calories} onChangeText={(v) => set({ calories: v })} />
            <NumberField label={t('logSheet.protein')} value={fields.proteinG} onChangeText={(v) => set({ proteinG: v })} />
          </View>
          <View className="flex-row gap-2.5 mb-3">
            <NumberField label={t('logSheet.carbs')} value={fields.carbsG} onChangeText={(v) => set({ carbsG: v })} />
            <NumberField label={t('logSheet.fat')} value={fields.fatG} onChangeText={(v) => set({ fatG: v })} />
          </View>

          <TextInput
            value={fields.servingLabel}
            onChangeText={(v) => set({ servingLabel: v })}
            placeholder={t('logSheet.servingLabelPlaceholder')}
            placeholderTextColor={Colors.hint}
            className="font-sans text-sm text-primary bg-base border-[1.5px] border-default rounded-xl px-3.5 py-2.5 mb-3"
          />

          <Pressable
            onPress={() => set({ saveToMyFoods: !fields.saveToMyFoods })}
            className="flex-row items-center gap-2.5"
          >
            <View
              className={`w-5 h-5 rounded-md items-center justify-center border-[1.5px] ${
                fields.saveToMyFoods ? 'bg-accent border-accent' : 'border-default'
              }`}
            >
              {fields.saveToMyFoods && <Check size={13} strokeWidth={3} color={Colors.primary} />}
            </View>
            <Text className="font-sans text-xs text-secondary">{t('logSheet.saveToMyFoods')}</Text>
          </Pressable>
        </View>
      )}

      <Text className="font-heading text-[9px] tracking-[2px] text-muted mb-2">{t('logSheet.mealType')}</Text>
      <View className="flex-row flex-wrap gap-2 mb-5">
        {MEAL_TYPES.map((mt) => {
          const active = mealType === mt;
          return (
            <Pressable
              key={mt}
              onPress={() => onChangeMealType(mt)}
              className={`px-4 py-2 rounded-full border-[1.5px] ${
                active ? 'bg-[rgba(230,48,48,0.1)] border-accent' : 'border-default'
              }`}
            >
              <Text className={`font-sans-medium text-xs ${active ? 'text-accent' : 'text-secondary'}`}>
                {t(`mealTypes.${mt}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {saveError && (
        <View className="flex-row items-center gap-1.5 mb-3 px-1">
          <AlertTriangle size={12} strokeWidth={2} color={Colors.warning} />
          <Text className="font-sans text-[11px] text-warning">{saveError}</Text>
        </View>
      )}

      <Pressable onPress={() => canSave && !saving && onSave()} disabled={!canSave || saving}>
        {canSave ? (
          <LinearGradient
            colors={[Colors.accent, Colors.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 16, paddingVertical: 17, alignItems: 'center' }}
          >
            <Text className="font-heading text-sm tracking-[2.5px] text-white">
              {saving ? t('logSheet.saving') : t('logSheet.logIt')}
            </Text>
          </LinearGradient>
        ) : (
          <View className="rounded-2xl py-[17px] bg-elevated items-center">
            <Text className="font-heading text-sm tracking-[2.5px] text-muted">{t('logSheet.logIt')}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
