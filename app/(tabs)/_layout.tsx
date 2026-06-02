import { useState, useCallback } from 'react';
import { Tabs, router } from 'expo-router';
import { CustomTabBar } from '@/components/ui/CustomTabBar';
import { LogPRSheet } from '@/components/ui/LogPRSheet';
import { LogSheet } from '@/components/ui/LogSheet';
import { Routes } from '@/constants/routes';

export default function TabsLayout() {
  const [logSheetVisible, setLogSheetVisible] = useState(false);
  const [logPRSheetVisible, setLogPRSheetVisible] = useState(false);

  const openLogSheet = useCallback(() => setLogSheetVisible(true), []);
  const closeLogSheet = useCallback(() => setLogSheetVisible(false), []);

  const handleLogPR = useCallback(() => {
    setLogSheetVisible(false);
    setLogPRSheetVisible(true);
  }, []);

  const handleCheckIn = useCallback(() => {
    setLogSheetVisible(false);
    router.push(Routes.trainCheckin);
  }, []);

  const closeLogPR = useCallback(() => setLogPRSheetVisible(false), []);

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <CustomTabBar {...props} onLogPress={openLogSheet} />
        )}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="compete" options={{ title: 'Compete' }} />
        <Tabs.Screen name="social" options={{ title: 'Social' }} />
        <Tabs.Screen name="train" options={{ title: 'Train' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
      <LogSheet
        visible={logSheetVisible}
        onClose={closeLogSheet}
        onLogPR={handleLogPR}
        onCheckIn={handleCheckIn}
      />
      <LogPRSheet visible={logPRSheetVisible} onClose={closeLogPR} />
    </>
  );
}
