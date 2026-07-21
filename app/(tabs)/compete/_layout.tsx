import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/constants/navigation';

export default function CompeteLayout() {
  return <Stack screenOptions={stackScreenOptions} />;
}
