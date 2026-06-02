import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useProgress } from '@/hooks/useProgress';
import { useAuthStore } from '@/store/useAuthStore';
import { ProgressStats } from './ProgressStats';
import { StrengthProgressChart } from './StrengthProgressChart';
import { ConsistencyHeatmap } from './ConsistencyHeatmap';
import { Colors, Fonts } from '@/constants/theme';

// Renders inside the parent ScrollView in train/index.tsx — no nested ScrollView needed.
export function ProgressView() {
  const user = useAuthStore((s) => s.user);
  const { data, loading, error } = useProgress(user?.id);

  if (loading && !data) {
    return (
      <View className="items-center py-16">
        <ActivityIndicator size="small" color={Colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View className="items-center py-16">
        <Text
          className="text-muted text-center"
          style={{ fontFamily: Fonts.body, fontSize: 13, lineHeight: 20 }}
        >
          {`Could not load progress:\n${error}`}
        </Text>
      </View>
    );
  }

  if (!data) return null;

  const { stats, series, bigThreeTotal, checkins } = data;
  const isEmpty =
    stats.totalPRs === 0 &&
    stats.workoutsCompleted === 0 &&
    stats.checkinStreak === 0 &&
    checkins.length === 0;

  return (
    <View>
      {isEmpty && (
        <View
          className="bg-surface rounded-2xl p-6 mb-4 items-center"
          style={{ borderWidth: 1.5, borderColor: Colors.borderDefault, borderStyle: 'dashed' }}
        >
          <Text
            className="text-primary mb-2"
            style={{ fontFamily: Fonts.display, fontSize: 16, letterSpacing: 3 }}
          >
            NO DATA YET
          </Text>
          <Text
            className="text-muted text-center"
            style={{ fontFamily: Fonts.body, fontSize: 13, lineHeight: 20 }}
          >
            Log a PR or check in to the gym to start tracking your progress.
          </Text>
        </View>
      )}

      <ProgressStats stats={stats} />

      <View className="h-4" />

      <StrengthProgressChart series={series} bigThreeTotal={bigThreeTotal} />

      <ConsistencyHeatmap checkins={checkins} />
    </View>
  );
}
