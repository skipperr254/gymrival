import { useState, useCallback } from 'react';
import { Tabs } from 'expo-router';
import { CustomTabBar } from '@/components/ui/CustomTabBar';
import { LogPRSheet } from '@/components/ui/LogPRSheet';

export default function TabsLayout() {
  const [logPRSheetVisible, setLogPRSheetVisible] = useState(false);

  const openLogPR = useCallback(() => setLogPRSheetVisible(true), []);
  const closeLogPR = useCallback(() => setLogPRSheetVisible(false), []);

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <CustomTabBar {...props} onLogPress={openLogPR} />
        )}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="compete" options={{ title: 'Compete' }} />
        <Tabs.Screen name="social" options={{ title: 'Social' }} />
        <Tabs.Screen name="train" options={{ title: 'Train' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
      <LogPRSheet visible={logPRSheetVisible} onClose={closeLogPR} />
    </>
  );
}
