import { useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList } from 'react-native';
import { Search, Plus, Utensils } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import type { Food } from '@/types/nutrition';

interface Step1SelectFoodProps {
  myFoods: Food[];
  onSelectFood: (food: Food) => void;
  onAddNew: () => void;
}

export function Step1SelectFood({ myFoods, onSelectFood, onAddNew }: Step1SelectFoodProps) {
  const { t } = useTranslation('nutrition');
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? myFoods.filter((f) => f.name.toLowerCase().includes(query.trim().toLowerCase()))
    : myFoods;

  return (
    <View>
      <Pressable
        onPress={onAddNew}
        className="flex-row items-center gap-3 bg-[rgba(230,48,48,0.08)] border-[1.5px] border-accent rounded-2xl py-3.5 px-4 mb-4"
        style={({ pressed }) => pressed && { opacity: 0.8 }}
      >
        <View className="w-9 h-9 rounded-xl bg-[rgba(230,48,48,0.12)] items-center justify-center">
          <Plus size={18} strokeWidth={2.4} color={Colors.accent} />
        </View>
        <Text className="font-sans-semibold text-sm text-accent flex-1">{t('logSheet.addNewFood')}</Text>
      </Pressable>

      <Text className="font-heading text-[10px] tracking-[2.5px] text-muted mb-2.5">
        {t('logSheet.myFoods')}
      </Text>

      <View className="flex-row items-center bg-base rounded-2xl border-[1.5px] border-default px-3.5 py-2.5 mb-3">
        <Search size={16} color={Colors.hint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('logSheet.searchFoods')}
          placeholderTextColor={Colors.hint}
          className="flex-1 font-sans text-sm text-primary ml-2.5 p-0"
        />
      </View>

      {filtered.length === 0 ? (
        <View className="items-center py-8">
          <Utensils size={24} color={Colors.hint} />
          <Text className="font-sans text-xs text-muted mt-2.5 text-center">
            {myFoods.length === 0 ? t('logSheet.noFoodsYet') : t('logSheet.noSearchResults')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(f) => f.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelectFood(item)}
              className="flex-row items-center justify-between bg-base rounded-2xl py-3 px-4"
              style={({ pressed }) => pressed && { opacity: 0.7 }}
            >
              <View className="flex-1 pr-3">
                <Text className="font-sans-semibold text-sm text-primary mb-0.5" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="font-sans text-[11px] text-muted">
                  {t('logSheet.macroSummary', {
                    calories: item.calories,
                    protein: item.protein_g,
                    carbs: item.carbs_g,
                    fat: item.fat_g,
                  })}
                </Text>
              </View>
              <Text className="font-heading text-lg text-accent">{Math.round(item.calories)}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
