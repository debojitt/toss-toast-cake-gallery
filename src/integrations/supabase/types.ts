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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      birthday_links: {
        Row: {
          cake_id: string | null
          created_at: string
          game_answer: string | null
          id: string
          played_at: string | null
          recipient_name: string
          relationship: string
          sender_name: string
          slug: string
        }
        Insert: {
          cake_id?: string | null
          created_at?: string
          game_answer?: string | null
          id?: string
          played_at?: string | null
          recipient_name: string
          relationship: string
          sender_name: string
          slug: string
        }
        Update: {
          cake_id?: string | null
          created_at?: string
          game_answer?: string | null
          id?: string
          played_at?: string | null
          recipient_name?: string
          relationship?: string
          sender_name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "birthday_links_cake_id_fkey"
            columns: ["cake_id"]
            isOneToOne: false
            referencedRelation: "cake_images"
            referencedColumns: ["id"]
          },
        ]
      }
      cake_delete_reservations: {
        Row: {
          expires_at: string
          storage_path: string
        }
        Insert: {
          expires_at: string
          storage_path: string
        }
        Update: {
          expires_at?: string
          storage_path?: string
        }
        Relationships: []
      }
      cake_images: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_featured: boolean
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_featured?: boolean
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_featured?: boolean
          sort_order?: number
          storage_path?: string
        }
        Relationships: []
      }
      cake_upload_reservations: {
        Row: {
          expires_at: string
          storage_path: string
        }
        Insert: {
          expires_at: string
          storage_path: string
        }
        Update: {
          expires_at?: string
          storage_path?: string
        }
        Relationships: []
      }
      shop_access_config: {
        Row: {
          failed_attempts: number
          id: number
          locked_until: string | null
          password_hash: string
        }
        Insert: {
          failed_attempts?: number
          id?: number
          locked_until?: string | null
          password_hash: string
        }
        Update: {
          failed_attempts?: number
          id?: number
          locked_until?: string | null
          password_hash?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cake_password_is_valid: { Args: { _password: string }; Returns: boolean }
      cake_upload_is_reserved: {
        Args: { _storage_path: string }
        Returns: boolean
      }
      create_birthday_link: {
        Args: {
          _cake_id?: string
          _recipient_name: string
          _relationship: string
          _sender_name: string
        }
        Returns: string
      }
      get_birthday_link: {
        Args: { _slug: string }
        Returns: {
          cake_path: string
          game_answer: string
          played_at: string
          recipient_name: string
          relationship: string
          sender_name: string
        }[]
      }
      hide_cake: {
        Args: { _cake_id: string; _password: string }
        Returns: boolean
      }
      publish_cake_upload: {
        Args: {
          _is_featured?: boolean
          _password: string
          _storage_path: string
        }
        Returns: string
      }
      record_birthday_answer: {
        Args: { _answer: string; _slug: string }
        Returns: boolean
      }
      reserve_cake_delete: {
        Args: { _password: string; _storage_path: string }
        Returns: boolean
      }
      reserve_cake_upload: {
        Args: { _password: string; _storage_path: string }
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
