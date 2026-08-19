import { useState, useCallback, useRef } from 'react';
import { Tabs, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CustomTabBar } from '@/components/ui/CustomTabBar';
import { LogPRSheet } from '@/components/features/logpr';
import { LogFoodSheet } from '@/components/features/nutrition';
import { LogSheet } from '@/components/ui/LogSheet';
import { Routes } from '@/constants/routes';

export default function TabsLayout() {
  const { t } = useTranslation('common');
  const [logSheetVisible, setLogSheetVisible] = useState(false);
  const [logPRSheetVisible, setLogPRSheetVisible] = useState(false);
  const [logFoodSheetVisible, setLogFoodSheetVisible] = useState(false);

  // The Log sheet and the Log-PR sheet are both React Native <Modal>s, and on
  // iOS each one is a UIViewController presented on the same parent. UIKit
  // silently refuses to present a second controller while the first is still
  // on screen: the request is dropped, no error is raised, but RN has already
  // marked the modal as presented. Because both sheets are `transparent`
  // (= UIModalPresentationOverFullScreen) and RN keeps the host view mounted
  // until the OS confirms dismissal, the result is an invisible full-screen
  // controller stuck in the hierarchy eating every touch — the app renders
  // fine and stops responding. Android stacks Dialogs happily, so it only
  // ever reproduced on iOS.
  //
  // Fix: never have two sheets open at once. Closing the Log sheet records
  // what it was about to do, and that runs only once the dismissal is
  // confirmed (see LogSheet's onClosed).
  const pendingAction = useRef<'logPR' | 'checkin' | 'meal' | null>(null);

  const openLogSheet = useCallback(() => setLogSheetVisible(true), []);

  const closeLogSheet = useCallback(() => {
    pendingAction.current = null;
    setLogSheetVisible(false);
  }, []);

  const handleLogPR = useCallback(() => {
    pendingAction.current = 'logPR';
    setLogSheetVisible(false);
  }, []);

  const handleCheckIn = useCallback(() => {
    pendingAction.current = 'checkin';
    setLogSheetVisible(false);
  }, []);

  const handleLogMeal = useCallback(() => {
    pendingAction.current = 'meal';
    setLogSheetVisible(false);
  }, []);

  // Runs once the Log sheet is fully gone — safe to present the next modal or
  // push a route. Navigating while a modal is mid-dismissal has the same class
  // of problem on iOS, so Check-in is sequenced through here too.
  const handleLogSheetClosed = useCallback(() => {
    const action = pendingAction.current;
    pendingAction.current = null;
    if (action === 'logPR') {
      setLogPRSheetVisible(true);
    } else if (action === 'checkin') {
      router.push(Routes.trainCheckin);
    } else if (action === 'meal') {
      setLogFoodSheetVisible(true);
    }
  }, []);

  const closeLogPR = useCallback(() => setLogPRSheetVisible(false), []);
  const closeLogFood = useCallback(() => setLogFoodSheetVisible(false), []);

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <CustomTabBar {...props} onLogPress={openLogSheet} />
        )}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="compete" options={{ title: t('tabs.compete') }} />
        <Tabs.Screen name="social" options={{ title: t('tabs.social') }} />
        <Tabs.Screen name="train" options={{ title: t('tabs.train') }} />
        <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
      </Tabs>
      <LogSheet
        visible={logSheetVisible}
        onClose={closeLogSheet}
        onClosed={handleLogSheetClosed}
        onLogPR={handleLogPR}
        onCheckIn={handleCheckIn}
        onLogMeal={handleLogMeal}
      />
      <LogPRSheet visible={logPRSheetVisible} onClose={closeLogPR} />
      <LogFoodSheet visible={logFoodSheetVisible} initialMealType="breakfast" onClose={closeLogFood} />
    </>
  );
}
