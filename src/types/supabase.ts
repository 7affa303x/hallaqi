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
      availability_exceptions: {
        Row: {
          created_at: string | null
          date: string
          end_time: string | null
          id: string
          professional_id: string | null
          reason: string | null
          start_time: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          end_time?: string | null
          id?: string
          professional_id?: string | null
          reason?: string | null
          start_time?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          end_time?: string | null
          id?: string
          professional_id?: string | null
          reason?: string | null
          start_time?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_exceptions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_schedules: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean | null
          professional_id: string | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean | null
          professional_id?: string | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          professional_id?: string | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_schedules_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_end_time: string
          booking_start_time: string
          client_id: string | null
          created_at: string | null
          id: string
          is_mobile_service: boolean
          notes: string | null
          payment_id: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          professional_id: string | null
          service_address: string | null
          service_id: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          total_price: number
          updated_at: string | null
        }
        Insert: {
          booking_end_time: string
          booking_start_time: string
          client_id?: string | null
          created_at?: string | null
          id?: string
          is_mobile_service?: boolean
          notes?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          professional_id?: string | null
          service_address?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price?: number
          updated_at?: string | null
        }
        Update: {
          booking_end_time?: string
          booking_start_time?: string
          client_id?: string | null
          created_at?: string | null
          id?: string
          is_mobile_service?: boolean
          notes?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          professional_id?: string | null
          service_address?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string | null
          id: string
          joined_at: string | null
          last_read_at: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          professional_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          professional_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          professional_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favorites_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      forum_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          likes_count: number | null
          parent_id: string | null
          post_id: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          parent_id?: string | null
          post_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          parent_id?: string | null
          post_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "forum_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_likes: {
        Row: {
          comment_id: string | null
          created_at: string | null
          id: string
          post_id: string | null
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "forum_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          author_id: string
          category_id: string | null
          comments_count: number | null
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          is_locked: boolean | null
          is_pinned: boolean | null
          likes_count: number | null
          title: string
          type: string | null
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          author_id: string
          category_id?: string | null
          comments_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          likes_count?: number | null
          title: string
          type?: string | null
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          author_id?: string
          category_id?: string | null
          comments_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          likes_count?: number | null
          title?: string
          type?: string | null
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_reports: {
        Row: {
          comment_id: string | null
          created_at: string | null
          id: string
          post_id: string | null
          reason: string
          reporter_id: string
          status: string | null
        }
        Insert: {
          comment_id?: string | null
          created_at?: string | null
          id?: string
          post_id?: string | null
          reason: string
          reporter_id: string
          status?: string | null
        }
        Update: {
          comment_id?: string | null
          created_at?: string | null
          id?: string
          post_id?: string | null
          reason?: string
          reporter_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "forum_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          sender_id: string | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          sender_id?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          sender_id?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string | null
          currency: string
          id: string
          metadata: Json | null
          provider: string
          receipt_url: string | null
          session_id: string
          status: string
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          booking_id?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          metadata?: Json | null
          provider?: string
          receipt_url?: string | null
          session_id: string
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          metadata?: Json | null
          provider?: string
          receipt_url?: string | null
          session_id?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          professional_id: string | null
          sort_order: number | null
          thumbnail_url: string | null
          type: Database["public"]["Enums"]["media_type"] | null
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          professional_id?: string | null
          sort_order?: number | null
          thumbnail_url?: string | null
          type?: Database["public"]["Enums"]["media_type"] | null
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          professional_id?: string | null
          sort_order?: number | null
          thumbnail_url?: string | null
          type?: Database["public"]["Enums"]["media_type"] | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          average_rating: number | null
          bio: string | null
          business_address: string | null
          business_email: string | null
          business_name: string | null
          business_phone: string | null
          cover_image_url: string | null
          created_at: string | null
          followers_count: number
          following_count: number
          has_id_card: boolean
          id: string
          id_card_verified: boolean
          is_active: boolean
          is_mobile: boolean
          is_subscribed: boolean
          latitude: number | null
          likes_count: number
          longitude: number | null
          review_count: number | null
          subscription_plan: string | null
          updated_at: string | null
          uses_scissors: boolean
          website_url: string | null
          years_of_experience: number
        }
        Insert: {
          average_rating?: number | null
          bio?: string | null
          business_address?: string | null
          business_email?: string | null
          business_name?: string | null
          business_phone?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          followers_count?: number
          following_count?: number
          has_id_card?: boolean
          id: string
          id_card_verified?: boolean
          is_active?: boolean
          is_mobile?: boolean
          is_subscribed?: boolean
          latitude?: number | null
          likes_count?: number
          longitude?: number | null
          review_count?: number | null
          subscription_plan?: string | null
          updated_at?: string | null
          uses_scissors?: boolean
          website_url?: string | null
          years_of_experience?: number
        }
        Update: {
          average_rating?: number | null
          bio?: string | null
          business_address?: string | null
          business_email?: string | null
          business_name?: string | null
          business_phone?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          followers_count?: number
          following_count?: number
          has_id_card?: boolean
          id?: string
          id_card_verified?: boolean
          is_active?: boolean
          is_mobile?: boolean
          is_subscribed?: boolean
          latitude?: number | null
          likes_count?: number
          longitude?: number | null
          review_count?: number | null
          subscription_plan?: string | null
          updated_at?: string | null
          uses_scissors?: boolean
          website_url?: string | null
          years_of_experience?: number
        }
        Relationships: [
          {
            foreignKeyName: "professionals_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          full_name: string | null
          id: string
          phone_number: string | null
          updated_at: string | null
          user_role: Database["public"]["Enums"]["user_role"] | null
          user_status: Database["public"]["Enums"]["user_status"] | null
          username: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          website: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          full_name?: string | null
          id: string
          phone_number?: string | null
          updated_at?: string | null
          user_role?: Database["public"]["Enums"]["user_role"] | null
          user_status?: Database["public"]["Enums"]["user_status"] | null
          username?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          website?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          full_name?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string | null
          user_role?: Database["public"]["Enums"]["user_role"] | null
          user_status?: Database["public"]["Enums"]["user_status"] | null
          username?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          website?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string | null
          comment: string | null
          created_at: string | null
          id: string
          is_public: boolean | null
          moderation_status:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          professional_id: string | null
          rating: number
          reviewer_id: string | null
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          professional_id?: string | null
          rating: number
          reviewer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          professional_id?: string | null
          rating?: number
          reviewer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: Database["public"]["Enums"]["service_category"] | null
          created_at: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean | null
          name: string
          price: number
          professional_id: string | null
          updated_at: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["service_category"] | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          professional_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["service_category"] | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          professional_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          accessibility_preferences: Json
          notification_preferences: Json
          privacy_preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          accessibility_preferences?: Json
          notification_preferences?: Json
          privacy_preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          accessibility_preferences?: Json
          notification_preferences?: Json
          privacy_preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_barber_onboarding: { Args: never; Returns: undefined }
      get_or_create_conversation: {
        Args: { user1_id: string; user2_id: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      mark_conversation_messages_as_read: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      booking_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      media_type: "image" | "video"
      moderation_status: "pending" | "approved" | "rejected"
      payment_status: "pending" | "paid" | "refunded" | "failed"
      service_category:
        | "haircut"
        | "beard"
        | "shave"
        | "hair_treatment"
        | "facial"
        | "coloring"
        | "styling"
        | "package"
      user_role: "client" | "barber" | "specialist" | "admin" | "moderator"
      user_status: "active" | "inactive" | "suspended" | "pending"
      verification_status: "unverified" | "pending" | "verified" | "premium"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      media_type: ["image", "video"],
      moderation_status: ["pending", "approved", "rejected"],
      payment_status: ["pending", "paid", "refunded", "failed"],
      service_category: [
        "haircut",
        "beard",
        "shave",
        "hair_treatment",
        "facial",
        "coloring",
        "styling",
        "package",
      ],
      user_role: ["client", "barber", "specialist", "admin", "moderator"],
      user_status: ["active", "inactive", "suspended", "pending"],
      verification_status: ["unverified", "pending", "verified", "premium"],
    },
  },
} as const

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Professional = Database["public"]["Tables"]["professionals"]["Row"]
export type Service = Database["public"]["Tables"]["services"]["Row"]
export type Booking = Database["public"]["Tables"]["bookings"]["Row"]
export type Review = Database["public"]["Tables"]["reviews"]["Row"]
export type Favorite = Database["public"]["Tables"]["favorites"]["Row"]
export type AvailabilitySchedule = Database["public"]["Tables"]["availability_schedules"]["Row"]
export type AvailabilityException = Database["public"]["Tables"]["availability_exceptions"]["Row"]
export type PortfolioItem = Database["public"]["Tables"]["portfolio_items"]["Row"]
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"]
export type ConversationMember = Database["public"]["Tables"]["conversation_members"]["Row"]
export type Message = Database["public"]["Tables"]["messages"]["Row"]
export type Notification = Database["public"]["Tables"]["notifications"]["Row"]
export type ForumPost = Database["public"]["Tables"]["forum_posts"]["Row"]
export type ForumComment = Database["public"]["Tables"]["forum_comments"]["Row"]
export type ForumCategory = Database["public"]["Tables"]["forum_categories"]["Row"]
export type ForumLike = Database["public"]["Tables"]["forum_likes"]["Row"]
export type ForumReport = Database["public"]["Tables"]["forum_reports"]["Row"]
export type Payment = Database["public"]["Tables"]["payments"]["Row"]
export type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"]
