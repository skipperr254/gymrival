import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, AlertTriangle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts } from '@/constants/theme';
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
  selectedEx: ExerciseType | undefined;
  canProceed: boolean;
  onNext: () => void;
  prMap: Record<string, number>;
}

export function Step1({ exercises, selectedExKey, onSelectEx, prValue, onChangePR, currentPR, isBelowCurrent, selectedEx, canProceed, onNext, prMap }: Step1Props) {
  const { t } = useTranslation('logpr');
  return (
    <>
      <Text style={s1.sectionLabel}>{t('selectExercise')}</Text>

      <View style={s1.grid}>
        {exercises.map(ex => {
          const active = selectedExKey === ex.key;
          const ExIcon = getIcon(ex.key);
          const exPR = prMap[ex.key];
          return (
            <Pressable
              key={ex.key}
              onPress={() => onSelectEx(ex.key)}
              style={({ pressed }) => [
                s1.exCard,
                active && s1.exCardActive,
                pressed && !active && { opacity: 0.7 },
              ]}
            >
              <View style={[s1.iconWrap, active && s1.iconWrapActive]}>
                <ExIcon size={18} strokeWidth={1.8} color={active ? Colors.accent : '#666'} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s1.exLabel, active && s1.exLabelActive]} numberOfLines={1}>
                  {ex.label}
                </Text>
                <Text style={s1.exPR}>
                  {exPR != null ? t('prWithValue', { value: exPR, unit: ex.unit }) : t('noPrYet')}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {selectedExKey && selectedEx && (
        <View style={s1.inputSection}>
          <Text style={s1.sectionLabel}>{t('yourNewPr')}</Text>
          <View style={[s1.inputRow, !!prValue && s1.inputRowActive]}>
            <TextInput
              value={prValue}
              onChangeText={onChangePR}
              placeholder={currentPR != null ? String(currentPR + 5) : '0'}
              placeholderTextColor="#444"
              keyboardType="numeric"
              returnKeyType="done"
              autoFocus
              style={s1.input}
            />
            <Text style={s1.unit}>{selectedEx.unit.toUpperCase()}</Text>
          </View>
          {isBelowCurrent && (
            <View style={s1.warnRow}>
              <AlertTriangle size={12} strokeWidth={2} color={Colors.warning} />
              <Text style={s1.warnText}>
                {t('notHigherThanCurrent', { value: currentPR, unit: selectedEx.unit })}
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
            style={s1.nextBtn}
          >
            <Text style={s1.nextBtnText}>{t('nextAddProof')}</Text>
            <TrendingUp size={16} strokeWidth={2} color="#fff" />
          </LinearGradient>
        ) : (
          <View style={[s1.nextBtn, s1.nextBtnDisabled]}>
            <Text style={[s1.nextBtnText, s1.nextBtnTextDisabled]}>{t('nextAddProof')}</Text>
          </View>
        )}
      </Pressable>
    </>
  );
}

const s1 = StyleSheet.create({
  sectionLabel: {
    fontFamily: Fonts.display,
    fontSize: 10,
    letterSpacing: 2.5,
    color: '#555',
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  exCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.base,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  exCardActive: {
    backgroundColor: 'rgba(230,48,48,0.08)',
    borderColor: Colors.accent,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(230,48,48,0.12)',
  },
  exLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  exLabelActive: {
    color: Colors.accent,
  },
  exPR: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: '#555',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.base,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 10,
  },
  inputRowActive: {
    borderColor: Colors.accent,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: 42,
    color: Colors.primary,
    padding: 0,
  },
  unit: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: '#555',
    letterSpacing: 1,
  },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  warnText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.warning,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 17,
  },
  nextBtnDisabled: {
    backgroundColor: '#2a2a2a',
  },
  nextBtnText: {
    fontFamily: Fonts.display,
    fontSize: 14,
    letterSpacing: 2.5,
    color: '#fff',
  },
  nextBtnTextDisabled: {
    color: '#555',
  },
});
