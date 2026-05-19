import { useState } from 'react';
import { Tabs } from 'expo-router';
import { CustomTabBar } from '@/components/ui/CustomTabBar';
import { LogSheet } from '@/components/ui/LogSheet';

export default function TabsLayout() {
  const [logSheetVisible, setLogSheetVisible] = useState(false);

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <CustomTabBar {...props} onLogPress={() => setLogSheetVisible(true)} />
        )}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="compete" options={{ title: 'Compete' }} />
        <Tabs.Screen name="social" options={{ title: 'Social' }} />
        <Tabs.Screen name="train" options={{ title: 'Train' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
      <LogSheet visible={logSheetVisible} onClose={() => setLogSheetVisible(false)} />
    </>
  );
}
