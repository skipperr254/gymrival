// Generated from the live Supabase schema — do not edit by hand.
// Regenerate after every migration (Supabase MCP generate_typescript_types, or
// npx supabase gen types typescript --project-id lkdtffbltslyatnwxeoo).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      billing_events: {
        Row: {
          event_id: string
          payload: Json | null
          provider: string
          received_at: string
          type: string
          user_id: string | null
        }
        Insert: {
          event_id: string
          payload?: Json | null
          provider: string
          received_at?: string
          type: string
          user_id?: string | null
        }
        Update: {
          event_id?: string
          payload?: Json | null
          provider?: string
          received_at?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      challenge_invitations: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          invitee_id: string
          inviter_id: string
          status: string
          updated_at: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          invitee_id: string
          inviter_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_invitations_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "challenge_invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "challenge_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          baseline_score: number
          challenge_id: string
          id: string
          joined_at: string
          score: number
          score_updated_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          baseline_score?: number
          challenge_id: string
          id?: string
          joined_at?: string
          score?: number
          score_updated_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          baseline_score?: number
          challenge_id?: string
          id?: string
          joined_at?: string
          score?: number
          score_updated_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "challenge_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_translations: {
        Row: {
          challenge_id: string
          created_at: string
          description: string | null
          id: string
          locale: string
          title: string
          updated_at: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          description?: string | null
          id?: string
          locale: string
          title: string
          updated_at?: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          description?: string | null
          id?: string
          locale?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_translations_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          exercise_key: string | null
          icon: string | null
          id: string
          max_participants: number | null
          metric: string
          prize_label: string | null
          reward_badge_slug: string | null
          reward_xp: number
          scope: string
          starts_at: string
          status: string
          title: string
          type: string
          updated_at: string
          winner_user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          exercise_key?: string | null
          icon?: string | null
          id?: string
          max_participants?: number | null
          metric: string
          prize_label?: string | null
          reward_badge_slug?: string | null
          reward_xp?: number
          scope?: string
          starts_at: string
          status?: string
          title: string
          type?: string
          updated_at?: string
          winner_user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          exercise_key?: string | null
          icon?: string | null
          id?: string
          max_participants?: number | null
          metric?: string
          prize_label?: string | null
          reward_badge_slug?: string | null
          reward_xp?: number
          scope?: string
          starts_at?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          winner_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_exercise_key_fkey"
            columns: ["exercise_key"]
            isOneToOne: false
            referencedRelation: "exercise_types"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "challenges_winner_user_id_fkey"
            columns: ["winner_user_id"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "challenges_winner_user_id_fkey"
            columns: ["winner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          last_message_id: string | null
          participant_a: string
          participant_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_id?: string | null
          participant_a: string
          participant_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_id?: string | null
          participant_a?: string
          participant_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_last_message_id_fkey"
            columns: ["last_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_a_fkey"
            columns: ["participant_a"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conversations_participant_a_fkey"
            columns: ["participant_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_b_fkey"
            columns: ["participant_b"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conversations_participant_b_fkey"
            columns: ["participant_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_types: {
        Row: {
          icon: string
          key: string
          label: string
          unit: string
        }
        Insert: {
          icon: string
          key: string
          label: string
          unit: string
        }
        Update: {
          icon?: string
          key?: string
          label?: string
          unit?: string
        }
        Relationships: []
      }
      foods: {
        Row: {
          calories: number
          carbs_g: number
          created_at: string
          fat_g: number
          id: string
          name: string
          protein_g: number
          serving_label: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calories: number
          carbs_g: number
          created_at?: string
          fat_g: number
          id?: string
          name: string
          protein_g: number
          serving_label?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number
          carbs_g?: number
          created_at?: string
          fat_g?: number
          id?: string
          name?: string
          protein_g?: number
          serving_label?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "foods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "foods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_checkins: {
        Row: {
          checked_in_at: string
          checked_out_at: string | null
          created_at: string
          gym_id: string
          id: string
          note: string | null
          user_id: string
          workout_log_id: string | null
          xp_awarded: boolean
        }
        Insert: {
          checked_in_at?: string
          checked_out_at?: string | null
          created_at?: string
          gym_id: string
          id?: string
          note?: string | null
          user_id: string
          workout_log_id?: string | null
          xp_awarded?: boolean
        }
        Update: {
          checked_in_at?: string
          checked_out_at?: string | null
          created_at?: string
          gym_id?: string
          id?: string
          note?: string | null
          user_id?: string
          workout_log_id?: string | null
          xp_awarded?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "gym_checkins_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gym_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_checkins_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          id: string
          is_verified: boolean
          lat: number | null
          lng: number | null
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gyms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gyms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_logs: {
        Row: {
          calories: number
          carbs_g: number
          created_at: string
          fat_g: number
          food_id: string | null
          id: string
          logged_at: string
          meal_type: string
          name: string
          protein_g: number
          user_id: string
        }
        Insert: {
          calories: number
          carbs_g: number
          created_at?: string
          fat_g: number
          food_id?: string | null
          id?: string
          logged_at?: string
          meal_type: string
          name: string
          protein_g: number
          user_id: string
        }
        Update: {
          calories?: number
          carbs_g?: number
          created_at?: string
          fat_g?: number
          food_id?: string | null
          id?: string
          logged_at?: string
          meal_type?: string
          name?: string
          protein_g?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_logs_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "meal_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          message_type: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          message_type?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          message_type?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          data: Json
          id: string
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      paywall_events: {
        Row: {
          created_at: string
          event: string
          id: string
          impression_id: string
          plan_id: string | null
          platform: string | null
          product_id: string | null
          trigger: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          impression_id: string
          plan_id?: string | null
          platform?: string | null
          product_id?: string | null
          trigger: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          impression_id?: string
          plan_id?: string | null
          platform?: string | null
          product_id?: string | null
          trigger?: string
          user_id?: string | null
        }
        Relationships: []
      }
      personal_records: {
        Row: {
          created_at: string
          exercise_key: string
          id: string
          unit: string
          user_id: string
          value: number
          visibility: string
        }
        Insert: {
          created_at?: string
          exercise_key: string
          id?: string
          unit: string
          user_id: string
          value: number
          visibility?: string
        }
        Update: {
          created_at?: string
          exercise_key?: string
          id?: string
          unit?: string
          user_id?: string
          value?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_exercise_key_fkey"
            columns: ["exercise_key"]
            isOneToOne: false
            referencedRelation: "exercise_types"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "personal_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "personal_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pr_likes: {
        Row: {
          created_at: string
          id: string
          pr_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pr_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pr_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pr_likes_pr_id_fkey"
            columns: ["pr_id"]
            isOneToOne: false
            referencedRelation: "personal_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pr_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pr_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pr_videos: {
        Row: {
          created_at: string
          duration_sec: number | null
          file_size_bytes: number | null
          id: string
          pr_id: string
          status: string
          thumbnail_path: string | null
          updated_at: string
          user_id: string
          video_height: number | null
          video_path: string
          video_width: number | null
        }
        Insert: {
          created_at?: string
          duration_sec?: number | null
          file_size_bytes?: number | null
          id?: string
          pr_id: string
          status?: string
          thumbnail_path?: string | null
          updated_at?: string
          user_id: string
          video_height?: number | null
          video_path: string
          video_width?: number | null
        }
        Update: {
          created_at?: string
          duration_sec?: number | null
          file_size_bytes?: number | null
          id?: string
          pr_id?: string
          status?: string
          thumbnail_path?: string | null
          updated_at?: string
          user_id?: string
          video_height?: number | null
          video_path?: string
          video_width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pr_videos_pr_id_fkey"
            columns: ["pr_id"]
            isOneToOne: true
            referencedRelation: "personal_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pr_videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pr_videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          avatar_url: string | null
          bio: string | null
          country_code: string | null
          created_at: string
          diet_goal: string | null
          email: string
          experience_level: string | null
          expo_push_token: string | null
          friends_count: number
          full_name: string | null
          goal: string | null
          gym: string | null
          height_cm: number | null
          id: string
          is_pro: boolean
          language: string | null
          level: number
          push_enabled: boolean
          quote: string | null
          role: string
          sex: string | null
          streak: number
          target_calories: number | null
          target_carbs_g: number | null
          target_fat_g: number | null
          target_protein_g: number | null
          updated_at: string
          username: string | null
          weight_kg: number | null
          xp: number
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string
          diet_goal?: string | null
          email: string
          experience_level?: string | null
          expo_push_token?: string | null
          friends_count?: number
          full_name?: string | null
          goal?: string | null
          gym?: string | null
          height_cm?: number | null
          id: string
          is_pro?: boolean
          language?: string | null
          level?: number
          push_enabled?: boolean
          quote?: string | null
          role?: string
          sex?: string | null
          streak?: number
          target_calories?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_protein_g?: number | null
          updated_at?: string
          username?: string | null
          weight_kg?: number | null
          xp?: number
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string
          diet_goal?: string | null
          email?: string
          experience_level?: string | null
          expo_push_token?: string | null
          friends_count?: number
          full_name?: string | null
          goal?: string | null
          gym?: string | null
          height_cm?: number | null
          id?: string
          is_pro?: boolean
          language?: string | null
          level?: number
          push_enabled?: boolean
          quote?: string | null
          role?: string
          sex?: string | null
          streak?: number
          target_calories?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_protein_g?: number | null
          updated_at?: string
          username?: string | null
          weight_kg?: number | null
          xp?: number
        }
        Relationships: []
      }
      session_exercises: {
        Row: {
          created_at: string
          exercise_key: string | null
          exercise_name: string
          id: string
          notes: string | null
          reps: string
          session_id: string
          sets: number
          sort_order: number
          target_weight: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_key?: string | null
          exercise_name: string
          id?: string
          notes?: string | null
          reps?: string
          session_id: string
          sets?: number
          sort_order?: number
          target_weight?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_key?: string | null
          exercise_name?: string
          id?: string
          notes?: string | null
          reps?: string
          session_id?: string
          sets?: number
          sort_order?: number
          target_weight?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_exercise_key_fkey"
            columns: ["exercise_key"]
            isOneToOne: false
            referencedRelation: "exercise_types"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "session_exercises_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          entitlement: string
          is_sandbox: boolean
          last_event_at: string | null
          product_id: string | null
          provider: string
          provider_customer_id: string | null
          status: string
          store: string | null
          updated_at: string
          user_id: string
          will_renew: boolean
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          entitlement?: string
          is_sandbox?: boolean
          last_event_at?: string | null
          product_id?: string | null
          provider?: string
          provider_customer_id?: string | null
          status: string
          store?: string | null
          updated_at?: string
          user_id: string
          will_renew?: boolean
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          entitlement?: string
          is_sandbox?: boolean
          last_event_at?: string | null
          product_id?: string | null
          provider?: string
          provider_customer_id?: string | null
          status?: string
          store?: string | null
          updated_at?: string
          user_id?: string
          will_renew?: boolean
        }
        Relationships: []
      }
      training_programs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_programs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "training_programs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          created_at: string
          day_of_week: number | null
          id: string
          name: string
          program_id: string | null
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          id?: string
          name: string
          program_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          id?: string
          name?: string
          program_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "training_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          last_seen_at: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_log_sets: {
        Row: {
          created_at: string
          exercise_key: string | null
          exercise_name: string
          id: string
          notes: string | null
          reps_completed: number | null
          session_exercise_id: string | null
          set_number: number
          user_id: string
          weight_used: number | null
          workout_log_id: string
        }
        Insert: {
          created_at?: string
          exercise_key?: string | null
          exercise_name: string
          id?: string
          notes?: string | null
          reps_completed?: number | null
          session_exercise_id?: string | null
          set_number: number
          user_id: string
          weight_used?: number | null
          workout_log_id: string
        }
        Update: {
          created_at?: string
          exercise_key?: string | null
          exercise_name?: string
          id?: string
          notes?: string | null
          reps_completed?: number | null
          session_exercise_id?: string | null
          set_number?: number
          user_id?: string
          weight_used?: number | null
          workout_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_log_sets_exercise_key_fkey"
            columns: ["exercise_key"]
            isOneToOne: false
            referencedRelation: "exercise_types"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "workout_log_sets_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            isOneToOne: false
            referencedRelation: "session_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_log_sets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "workout_log_sets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_log_sets_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          gym_checkin_id: string | null
          id: string
          is_complete: boolean
          notes: string | null
          session_id: string | null
          session_name: string
          sets_completed: number
          total_sets: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          gym_checkin_id?: string | null
          id?: string
          is_complete?: boolean
          notes?: string | null
          session_id?: string | null
          session_name: string
          sets_completed?: number
          total_sets?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          gym_checkin_id?: string | null
          id?: string
          is_complete?: boolean
          notes?: string | null
          session_id?: string | null
          session_name?: string
          sets_completed?: number
          total_sets?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_gym_checkin_id_fkey"
            columns: ["gym_checkin_id"]
            isOneToOne: false
            referencedRelation: "gym_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "entitlement_mirror_drift"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "workout_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      entitlement_mirror_drift: {
        Row: {
          current_period_end: string | null
          profile_mirror: boolean | null
          provider: string | null
          should_be_pro: boolean | null
          status: string | null
          user_id: string | null
        }
        Relationships: []
      }
      paywall_funnel: {
        Row: {
          conversion_pct: number | null
          dismissals: number | null
          first_seen: string | null
          impressions: number | null
          last_seen: string | null
          purchases_completed: number | null
          purchases_started: number | null
          trigger: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      active_challenges_for_user: {
        Args: { p_locale?: string; p_user_id: string }
        Returns: {
          created_by: string
          description: string
          ends_at: string
          exercise_key: string
          icon: string
          id: string
          is_joined: boolean
          metric: string
          participant_count: number
          prize_label: string
          reward_xp: number
          scope: string
          starts_at: string
          status: string
          title: string
          type: string
          user_rank: number
          user_score: number
          winner_user_id: string
        }[]
      }
      challenge_is_joinable: {
        Args: { p_challenge_id: string }
        Returns: boolean
      }
      challenge_leaderboard: {
        Args: { p_challenge_id: string; p_viewer_id: string }
        Returns: {
          avatar_url: string
          baseline_score: number
          full_name: string
          is_me: boolean
          joined_at: string
          level: number
          rank: number
          score: number
          user_id: string
          username: string
        }[]
      }
      complete_expired_challenges: { Args: never; Returns: number }
      create_friend_challenge: {
        Args: {
          p_description: string
          p_ends_at: string
          p_exercise_key: string
          p_invitee_id: string
          p_metric: string
          p_prize_label: string
          p_title: string
        }
        Returns: string
      }
      delete_personal_record: {
        Args: { p_pr_id: string }
        Returns: {
          thumbnail_path: string
          video_path: string
        }[]
      }
      global_leaderboard: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_viewer_id?: string
        }
        Returns: {
          avatar_url: string
          bench_pr: number
          country_code: string
          deadlift_pr: number
          full_name: string
          is_me: boolean
          level: number
          rank: number
          squat_pr: number
          total_kg: number
          user_id: string
          username: string
        }[]
      }
      gym_checkin_day: { Args: { ts: string }; Returns: string }
      gym_today_checkin_counts: {
        Args: never
        Returns: {
          count: number
          gym_id: string
        }[]
      }
      is_challenge_creator: {
        Args: { p_challenge_id: string; p_user_id: string }
        Returns: boolean
      }
      is_pro_user: { Args: { p_user_id: string }; Returns: boolean }
      my_global_rank: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          bench_pr: number
          country_code: string
          deadlift_pr: number
          full_name: string
          is_me: boolean
          level: number
          rank: number
          squat_pr: number
          total_kg: number
          user_id: string
          username: string
        }[]
      }
      refresh_expired_entitlements: { Args: never; Returns: number }
      rivals_leaderboard: {
        Args: { p_exercise_key: string }
        Returns: {
          avatar_url: string
          best_pr: number
          full_name: string
          level: number
          unit: string
          user_id: string
          username: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      subscription_is_active: {
        Args: { p_period_end: string; p_status: string }
        Returns: boolean
      }
      user_can_view_challenge: {
        Args: { p_challenge_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
