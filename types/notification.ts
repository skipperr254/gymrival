export type NotificationType =
  | 'new_message'
  | 'friend_request'
  | 'friend_request_accepted'
  | 'pr_liked'
  | 'friend_pr';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  actor_id: string | null;
  actor_name: string | null;
  actor_username: string | null;
  actor_avatar_url: string | null;
  data: {
    conversation_id?: string;
    message_preview?: string;
    friendship_id?: string;
    pr_id?: string;
    exercise_label?: string;
    value?: number;
    unit?: string;
  };
  read_at: string | null;
  created_at: string;
}
