import { View, Text, Pressable, StyleSheet, type GestureResponderHandlers } from 'react-native';
import { X, ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { rtlIconFlip } from '@/lib/i18n/rtl';
import { Colors } from '@/constants/theme';

interface Props {
  step: 1 | 2 | 3;
  /** Drag-to-dismiss handlers from the sheet's PanResponder. */
  panHandlers: GestureResponderHandlers;
  onBack: () => void;
  onClose: () => void;
}

/** Draggable top of the Log-a-PR sheet: handle, step title, close, progress. */
export function LogPRSheetHeader({ step, panHandlers, onBack, onClose }: Props) {
  const { t } = useTranslation('logpr');

  return (
    <View
      {...panHandlers}
      className="px-5 pt-3 pb-3.5 bg-surface rounded-t-[22px]"
      style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderDefault }}
    >
      <View className="w-9 h-1 rounded-full bg-ink-750 self-center mb-3.5" />

      <View className="flex-row justify-between items-center mb-3.5">
        <View className="flex-row items-center gap-2">
          {step === 2 && (
            <Pressable onPress={onBack} hitSlop={14} className="mr-0.5">
              <ChevronLeft size={22} strokeWidth={2.2} color={Colors.ink450} style={rtlIconFlip} />
            </Pressable>
          )}
          <View>
            {step < 3 && (
              <Text className="font-heading text-[9px] tracking-[2.5px] text-muted mb-[3px]">
                {t('step.stepOf', { step })}
              </Text>
            )}
            <Text className="font-heading text-[22px] tracking-[1px] text-primary leading-6">
              {step === 1 ? t('step.logYourPr') : step === 2 ? t('step.addProof') : ''}
            </Text>
          </View>
        </View>
        {step < 3 && (
          <Pressable
            onPress={onClose}
            hitSlop={8}
            className="w-8 h-8 rounded-2xl bg-elevated items-center justify-center"
          >
            <X size={16} strokeWidth={2.8} color={Colors.ink450} />
          </Pressable>
        )}
      </View>

      {step < 3 && (
        <View className="flex-row gap-1.5">
          <View
            className={`flex-1 h-[3px] rounded-full ${step >= 1 ? 'bg-accent' : 'bg-elevated'}`}
          />
          <View
            className={`flex-1 h-[3px] rounded-full ${step >= 2 ? 'bg-accent' : 'bg-elevated'}`}
          />
        </View>
      )}
    </View>
  );
}
