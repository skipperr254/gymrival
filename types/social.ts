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
