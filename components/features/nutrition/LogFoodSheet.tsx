import { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, Pressable, ScrollView, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useNutritionStore } from '@/store/useNutritionStore';
import type { Food, MealType } from '@/types/nutrition';
import { Step1SelectFood } from './Step1SelectFood';
import { Step2FoodDetails } from './Step2FoodDetails';
import { Step3Confirmation } from './Step3Confirmation';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

const EMPTY_FIELDS = {
  name: '',
  calories: '',
  proteinG: '',
  carbsG: '',
  fatG: '',
  servingLabel: '',
  saveToMyFoods: true,
};

interface Props {
  visible: boolean;
  initialMealType: MealType;
  onClose: () => void;
}

export function LogFoodSheet({ visible, initialMealType, onClose }: Props) {
  const { t } = useTranslation('nutrition');
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const myFoods = useNutritionStore((s) => s.myFoods);
  const loadNutritionData = useNutritionStore((s) => s.loadNutritionData);
  const addFood = useNutritionStore((s) => s.addFood);
  const logMealAction = useNutritionStore((s) => s.logMeal);

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [mealType, setMealType] = useState<MealType>(initialMealType);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [quantity, setQuantity] = useState('1');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loggedSummary, setLoggedSummary] = useState<{
    name: string;
    mealType: MealType;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  } | null>(null);

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const visibleRef = useRef(visible);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    visibleRef.current = visible;

    if (visible) {
      setMounted(true);
      translateY.setValue(SHEET_HEIGHT);
      const raf = requestAnimationFrame(() => {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 320,
          easing: Easing.bezier(0.32, 0.72, 0, 1),
          useNativeDriver: true,
        }).start();
      });
      return () => cancelAnimationFrame(raf);
    }

    Animated.timing(translateY, {
      toValue: SHEET_HEIGHT,
      duration: 240,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (visibleRef.current) return;
      setMounted(false);
    });
  }, [visible, translateY]);

  // Reset to a clean state each time the sheet opens
  useEffect(() => {
    if (!visible) {
      clearTimeout(closeTimer.current);
      return;
    }
    setStep(1);
    setMode('new');
    setSelectedFood(null);
    setMealType(initialMealType);
    setFields(EMPTY_FIELDS);
    setQuantity('1');
    setSaving(false);
    setSaveError(null);
    setLoggedSummary(null);
    // Covers opening this sheet straight from the FAB before the user has
    // ever visited Train > Nutrition (which is what normally loads My Foods).
    if (user?.id) loadNutritionData(user.id);
  }, [visible, initialMealType, user?.id]);

  // Auto-close a couple seconds after the success step so the user sees
  // confirmation of what was logged, mirroring LogPRSheet's Step3 pattern.
  useEffect(() => {
    if (step !== 3) {
      clearTimeout(closeTimer.current);
      return;
    }
    closeTimer.current = setTimeout(onClose, 2200);
    return () => clearTimeout(closeTimer.current);
  }, [step, onClose]);

  const handleSelectFood = (food: Food) => {
    setMode('existing');
    setSelectedFood(food);
    setQuantity('1');
    setStep(2);
  };

  const handleAddNew = () => {
    setMode('new');
    setSelectedFood(null);
    setFields(EMPTY_FIELDS);
    setStep(2);
  };

  const canSave =
    mode === 'existing'
      ? !!selectedFood && (parseFloat(quantity) || 0) > 0
      : fields.name.trim().length > 0 && fields.calories.trim().length > 0;

  const handleSave = async () => {
    if (!user?.id || !canSave) return;
    setSaving(true);
    setSaveError(null);

    let logInput;
    if (mode === 'existing' && selectedFood) {
      const qty = parseFloat(quantity) || 0;
      logInput = {
        food_id: selectedFood.id,
        name: selectedFood.name,
        calories: Math.round(selectedFood.calories * qty),
        protein_g: Math.round(selectedFood.protein_g * qty),
        carbs_g: Math.round(selectedFood.carbs_g * qty),
        fat_g: Math.round(selectedFood.fat_g * qty),
        meal_type: mealType,
      };
    } else {
      const calories = parseFloat(fields.calories) || 0;
      const proteinG = parseFloat(fields.proteinG) || 0;
      const carbsG = parseFloat(fields.carbsG) || 0;
      const fatG = parseFloat(fields.fatG) || 0;

      if (fields.saveToMyFoods) {
        await addFood(user.id, {
          name: fields.name.trim(),
          serving_label: fields.servingLabel.trim() || null,
          calories,
          protein_g: proteinG,
          carbs_g: carbsG,
          fat_g: fatG,
        });
      }

      logInput = {
        food_id: null,
        name: fields.name.trim(),
        calories,
        protein_g: proteinG,
        carbs_g: carbsG,
        fat_g: fatG,
        meal_type: mealType,
      };
    }

    const { error } = await logMealAction(user.id, logInput);
    setSaving(false);

    if (error) {
      setSaveError(error);
      return;
    }
    setLoggedSummary({
      name: logInput.name,
      mealType: logInput.meal_type,
      calories: logInput.calories,
      proteinG: logInput.protein_g,
      carbsG: logInput.carbs_g,
      fatG: logInput.fat_g,
    });
    setStep(3);
  };

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 bg-black/[0.78] justify-end">
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          className="bg-surface rounded-t-[22px] overflow-hidden"
          style={{ height: SHEET_HEIGHT, paddingBottom: Math.max(insets.bottom + 16, 28), transform: [{ translateY }] }}
        >
          <View
            className="px-5 pt-4 pb-3.5"
            style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderDefault }}
          >
            <View className="w-9 h-1 rounded-full bg-[#3a3a3a] self-center mb-3.5" />
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-2">
                {step === 2 && (
                  <Pressable onPress={() => setStep(1)} hitSlop={14} className="mr-0.5">
                    <ChevronLeft size={22} strokeWidth={2.2} color="#888" />
                  </Pressable>
                )}
                <Text className="font-heading text-[22px] tracking-[1px] text-primary leading-6">
                  {step === 1 ? t('logSheet.titleSelect') : step === 2 ? t('logSheet.titleDetails') : ''}
                </Text>
              </View>
              {step < 3 && (
                <Pressable onPress={onClose} hitSlop={8} className="w-8 h-8 rounded-2xl bg-elevated items-center justify-center">
                  <X size={16} strokeWidth={2.8} color="#888" />
                </Pressable>
              )}
            </View>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            {step === 1 && (
              <Step1SelectFood myFoods={myFoods} onSelectFood={handleSelectFood} onAddNew={handleAddNew} />
            )}
            {step === 2 && (
              <Step2FoodDetails
                mode={mode}
                food={selectedFood}
                mealType={mealType}
                onChangeMealType={setMealType}
                fields={fields}
                onChangeFields={setFields}
                quantity={quantity}
                onChangeQuantity={setQuantity}
                saving={saving}
                saveError={saveError}
                canSave={canSave}
                onSave={handleSave}
              />
            )}
            {step === 3 && loggedSummary && (
              <Step3Confirmation
                name={loggedSummary.name}
                mealType={loggedSummary.mealType}
                calories={loggedSummary.calories}
                proteinG={loggedSummary.proteinG}
                carbsG={loggedSummary.carbsG}
                fatG={loggedSummary.fatG}
              />
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 16,
  },
});
