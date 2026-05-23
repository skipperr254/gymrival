export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
}

/** An accepted friend with their profile and the shared friendship metadata */
export interface FriendProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  friendship_id: string;
  friendship_status: FriendshipStatus;
  /** true = current user sent the original request */
  is_requester: boolean;
}

/**
 * A profile returned from user search, enriched with the current user's
 * relationship to that person.
 *
 * friendship_id / friendship_status / is_requester are null when there is
 * no existing relationship.
 */
export interface UserSearchResult {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  friendship_id: string | null;
  friendship_status: FriendshipStatus | null;
  /** true = current user sent the request, false = they sent it, null = no relation */
  is_requester: boolean | null;
}

/** A pending friend request with the other user's profile attached */
export interface FriendRequest {
  friendship_id: string;
  created_at: string;
  user: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    level: number;
    xp: number;
  };
}

/**
 * A social feed post — a personal_record enriched with its author's profile,
 * exercise label, and aggregated like data for the current viewer.
 */
export interface FeedPost {
  /** personal_records.id */
  id: string;
  user_id: string;
  exercise_key: string;
  exercise_label: string;
  value: number;
  unit: string;
  created_at: string;
  /** Author profile */
  author_name: string | null;
  author_username: string | null;
  author_avatar_url: string | null;
  author_level: number;
  /** Gym name used as location display (from profiles.gym) */
  author_gym: string | null;
  /** Total number of likes this post has received */
  likes_count: number;
  /** Whether the currently authenticated user has liked this post */
  has_liked: boolean;
}
