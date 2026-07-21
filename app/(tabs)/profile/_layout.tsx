import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/constants/navigation';

export default function ProfileLayout() {
  return <Stack screenOptions={stackScreenOptions} />;
}
