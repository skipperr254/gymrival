import { View, Text, Pressable, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, AlertTriangle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import type { ExerciseType } from '@/types/pr';
import { getIcon } from './icons';

interface Step1Props {
  exercises: ExerciseType[];
  selectedExKey: string | null;
  onSelectEx: (key: string) => void;
  prValue: string;
  onChangePR: (v: string) => void;
  currentPR: number | null;
  isBelowCurrent: boolean;
  isTooLarge: boolean;
  selectedEx: ExerciseType | undefined;
  canProceed: boolean;
  onNext: () => void;
  prMap: Record<string, number>;
}

export function Step1({ exercises, selectedExKey, onSelectEx, prValue, onChangePR, currentPR, isBelowCurrent, isTooLarge, selectedEx, canProceed, onNext, prMap }: Step1Props) {
  const { t } = useTranslation('logpr');
  return (
    <>
      <Text className="font-heading text-[10px] tracking-[2.5px] text-[#555] mb-2.5">
        {t('selectExercise')}
      </Text>

      <View className="flex-row flex-wrap gap-2 mb-5">
        {exercises.map(ex => {
          const active = selectedExKey === ex.key;
          const ExIcon = getIcon(ex.key);
          const exPR = prMap[ex.key];
          return (
            <Pressable
              key={ex.key}
              onPress={() => onSelectEx(ex.key)}
              className={`w-[48%] flex-row items-center gap-2.5 rounded-2xl py-[11px] px-3 border-[1.5px] ${
                active ? 'bg-[rgba(230,48,48,0.08)] border-accent' : 'bg-base border-default'
              }`}
              style={({ pressed }) => pressed && !active && { opacity: 0.7 }}
            >
              <View
                className={`w-[34px] h-[34px] rounded-[10px] items-center justify-center shrink-0 ${
                  active ? 'bg-[rgba(230,48,48,0.12)]' : 'bg-[#1a1a1a]'
                }`}
              >
                <ExIcon size={18} strokeWidth={1.8} color={active ? Colors.accent : '#666'} />
              </View>
              <View className="flex-1 min-w-0">
                <Text
                  className={`font-sans-medium text-xs mb-0.5 ${active ? 'text-accent' : 'text-[#999]'}`}
                  numberOfLines={1}
                >
                  {ex.label}
                </Text>
                <Text className="font-sans text-[10px] text-[#555]">
                  {exPR != null ? t('prWithValue', { value: exPR, unit: ex.unit }) : t('noPrYet')}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {selectedExKey && selectedEx && (
        <View className="mb-5">
          <Text className="font-heading text-[10px] tracking-[2.5px] text-[#555] mb-2.5">
            {t('yourNewPr')}
          </Text>
          <View
            className={`flex-row items-center bg-base rounded-2xl border-[1.5px] px-[18px] py-3 gap-2.5 ${
              prValue ? 'border-accent' : 'border-default'
            }`}
          >
            <TextInput
              value={prValue}
              onChangeText={onChangePR}
              placeholder={currentPR != null ? String(currentPR + 5) : '0'}
              placeholderTextColor="#444"
              keyboardType="numeric"
              returnKeyType="done"
              autoFocus
              className="flex-1 font-heading text-[42px] text-primary p-0"
            />
            <Text className="font-heading text-base text-[#555] tracking-[1px]">
              {selectedEx.unit.toUpperCase()}
            </Text>
          </View>
          {isBelowCurrent && (
            <View className="flex-row items-center gap-1.5 mt-2 px-1">
              <AlertTriangle size={12} strokeWidth={2} color={Colors.warning} />
              <Text className="font-sans text-[11px] text-warning">
                {t('notHigherThanCurrent', { value: currentPR, unit: selectedEx.unit })}
              </Text>
            </View>
          )}
          {isTooLarge && (
            <View className="flex-row items-center gap-1.5 mt-2 px-1">
              <AlertTriangle size={12} strokeWidth={2} color={Colors.warning} />
              <Text className="font-sans text-[11px] text-warning">
                {t('valueTooLarge')}
              </Text>
            </View>
          )}
        </View>
      )}

      <Pressable
        onPress={() => canProceed && onNext()}
        disabled={!canProceed}
        style={({ pressed }) => [pressed && canProceed && { opacity: 0.85 }]}
      >
        {canProceed ? (
          <LinearGradient
            colors={[Colors.accent, Colors.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderRadius: 16,
              paddingVertical: 17,
            }}
          >
            <Text className="font-heading text-sm tracking-[2.5px] text-white">
              {t('nextAddProof')}
            </Text>
            <TrendingUp size={16} strokeWidth={2} color="#fff" />
          </LinearGradient>
        ) : (
          <View className="flex-row items-center justify-center gap-2 rounded-2xl py-[17px] bg-[#2a2a2a]">
            <Text className="font-heading text-sm tracking-[2.5px] text-[#555]">
              {t('nextAddProof')}
            </Text>
          </View>
        )}
      </Pressable>
    </>
  );
}
