import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/constants/navigation';

export default function SocialLayout() {
  return <Stack screenOptions={stackScreenOptions} />;
}
