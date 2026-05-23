export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
}

export interface FriendProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  level: number;
  friendship_id: string;
  friendship_status: FriendshipStatus;
  is_requester: boolean;
}
