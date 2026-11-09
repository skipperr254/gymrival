import type { Href } from 'expo-router';
import { Routes } from '@/constants/routes';

/**
 * Where tapping a notification takes the user. One function for both entry
 * points: a tapped push (app/_layout.tsx) and a row in the in-app list
 * ((stack)/notifications.tsx), so the two can't drift apart.
 *
 * `actorId` is the other person. The in-app row always has it. The push payload
 * currently doesn't (send-notification sends `{ type, ...data }`), so a message
 * push opens the inbox rather than the specific chat.
 */
export function notificationRoute(
  type: unknown,
  data: { challenge_id?: unknown } | undefined,
  actorId?: string | null
): Href | null {
  switch (type) {
    case 'new_message':
      return actorId ? Routes.chat(actorId) : Routes.socialMessages;
    case 'friend_request':
    case 'friend_request_accepted':
      return Routes.socialFriends;
    case 'pr_liked':
    case 'friend_pr':
      return Routes.social;
    case 'challenge_won':
      return typeof data?.challenge_id === 'string'
        ? Routes.challengeDetail(data.challenge_id)
        : Routes.compete;
    default:
      return null;
  }
}
