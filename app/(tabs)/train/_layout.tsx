import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/constants/navigation';

export default function TrainLayout() {
  return <Stack screenOptions={stackScreenOptions} />;
}
