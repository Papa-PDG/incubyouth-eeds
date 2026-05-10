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
      camps: {
        Row: {
          age: string
          created_at: string
          duree: number
          effectif: string
          id: string
          nom_camp: string
          plan_json: Json
          region: string
          theme: string
          user_id: string
        }
        Insert: {
          age: string
          created_at?: string
          duree: number
          effectif: string
          id?: string
          nom_camp: string
          plan_json: Json
          region: string
          theme: string
          user_id: string
        }
        Update: {
          age?: string
          created_at?: string
          duree?: number
          effectif?: string
          id?: string
          nom_camp?: string
          plan_json?: Json
          region?: string
          theme?: string
          user_id?: string
        }
        Relationships: []
      }
      config_bot: {
        Row: {
          id: string
          message_bienvenue: string
          mode_strict: boolean
          prompt_system: string
          themes_actifs: string[]
          ton: string
          updated_at: string
        }
        Insert: {
          id?: string
          message_bienvenue?: string
          mode_strict?: boolean
          prompt_system?: string
          themes_actifs?: string[]
          ton?: string
          updated_at?: string
        }
        Update: {
          id?: string
          message_bienvenue?: string
          mode_strict?: boolean
          prompt_system?: string
          themes_actifs?: string[]
          ton?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          titre: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          titre?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          titre?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evenements: {
        Row: {
          created_at: string
          created_by: string | null
          date_debut: string
          date_fin: string
          description: string | null
          google_calendar_id: string | null
          id: string
          lien_externe: string | null
          lieu: string | null
          nb_inscrits: number
          nb_places: number
          rappel_email: boolean
          region: string
          responsable: string | null
          titre: string
          type: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_debut: string
          date_fin: string
          description?: string | null
          google_calendar_id?: string | null
          id?: string
          lien_externe?: string | null
          lieu?: string | null
          nb_inscrits?: number
          nb_places?: number
          rappel_email?: boolean
          region?: string
          responsable?: string | null
          titre: string
          type: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_debut?: string
          date_fin?: string
          description?: string | null
          google_calendar_id?: string | null
          id?: string
          lien_externe?: string | null
          lieu?: string | null
          nb_inscrits?: number
          nb_places?: number
          rappel_email?: boolean
          region?: string
          responsable?: string | null
          titre?: string
          type?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      evenements_inscriptions: {
        Row: {
          created_at: string
          evenement_id: string
          id: string
          statut: string
          user_id: string
        }
        Insert: {
          created_at?: string
          evenement_id: string
          id?: string
          statut?: string
          user_id: string
        }
        Update: {
          created_at?: string
          evenement_id?: string
          id?: string
          statut?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evenements_inscriptions_evenement_id_fkey"
            columns: ["evenement_id"]
            isOneToOne: false
            referencedRelation: "evenements"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_likes: {
        Row: {
          created_at: string
          id: string
          reply_id: string | null
          thread_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reply_id?: string | null
          thread_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reply_id?: string | null
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_likes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_likes_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_replies: {
        Row: {
          contenu: string
          created_at: string
          est_meilleure_reponse: boolean
          id: string
          nb_likes: number
          thread_id: string
          user_id: string
        }
        Insert: {
          contenu: string
          created_at?: string
          est_meilleure_reponse?: boolean
          id?: string
          nb_likes?: number
          thread_id: string
          user_id: string
        }
        Update: {
          contenu?: string
          created_at?: string
          est_meilleure_reponse?: boolean
          id?: string
          nb_likes?: number
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_signalements: {
        Row: {
          created_at: string
          id: string
          raison: string
          reply_id: string | null
          thread_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          raison: string
          reply_id?: string | null
          thread_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          raison?: string
          reply_id?: string | null
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_signalements_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_signalements_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_threads: {
        Row: {
          categorie: string
          contenu: string
          created_at: string
          est_epingle: boolean
          est_ferme: boolean
          est_resolu: boolean
          id: string
          nb_likes: number
          nb_vues: number
          titre: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categorie: string
          contenu: string
          created_at?: string
          est_epingle?: boolean
          est_ferme?: boolean
          est_resolu?: boolean
          id?: string
          nb_likes?: number
          nb_vues?: number
          titre: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categorie?: string
          contenu?: string
          created_at?: string
          est_epingle?: boolean
          est_ferme?: boolean
          est_resolu?: boolean
          id?: string
          nb_likes?: number
          nb_vues?: number
          titre?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          feedback: string | null
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          groupe_scout: string | null
          id: string
          last_seen_at: string
          nom: string | null
          prenom: string | null
          region: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          groupe_scout?: string | null
          id: string
          last_seen_at?: string
          nom?: string | null
          prenom?: string | null
          region?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          groupe_scout?: string | null
          id?: string
          last_seen_at?: string
          nom?: string | null
          prenom?: string | null
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ressources: {
        Row: {
          annee: number
          categorie: string
          couverture_url: string | null
          created_at: string
          description: string | null
          est_nouveau: boolean
          est_populaire: boolean
          fichier_url: string | null
          id: string
          nb_pages: number
          nb_telechargements: number
          tags: string[]
          taille_mo: number
          titre: string
          updated_at: string
          uploaded_by: string | null
          visible: boolean
        }
        Insert: {
          annee?: number
          categorie: string
          couverture_url?: string | null
          created_at?: string
          description?: string | null
          est_nouveau?: boolean
          est_populaire?: boolean
          fichier_url?: string | null
          id?: string
          nb_pages?: number
          nb_telechargements?: number
          tags?: string[]
          taille_mo?: number
          titre: string
          updated_at?: string
          uploaded_by?: string | null
          visible?: boolean
        }
        Update: {
          annee?: number
          categorie?: string
          couverture_url?: string | null
          created_at?: string
          description?: string | null
          est_nouveau?: boolean
          est_populaire?: boolean
          fichier_url?: string | null
          id?: string
          nb_pages?: number
          nb_telechargements?: number
          tags?: string[]
          taille_mo?: number
          titre?: string
          updated_at?: string
          uploaded_by?: string | null
          visible?: boolean
        }
        Relationships: []
      }
      ressources_favoris: {
        Row: {
          created_at: string
          id: string
          ressource_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ressource_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ressource_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ressources_favoris_ressource_id_fkey"
            columns: ["ressource_id"]
            isOneToOne: false
            referencedRelation: "ressources"
            referencedColumns: ["id"]
          },
        ]
      }
      ressources_telechargements: {
        Row: {
          created_at: string
          id: string
          ressource_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ressource_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ressource_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ressources_telechargements_ressource_id_fkey"
            columns: ["ressource_id"]
            isOneToOne: false
            referencedRelation: "ressources"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_profiles: {
        Args: { _ids: string[] }
        Returns: {
          id: string
          last_seen_at: string
          nom: string
          prenom: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      touch_last_seen: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
