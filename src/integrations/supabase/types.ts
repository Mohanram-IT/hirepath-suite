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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      auth_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          metadata: Json
          purpose: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          metadata?: Json
          purpose?: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          metadata?: Json
          purpose?: string
        }
        Relationships: []
      }
      candidate_applications: {
        Row: {
          assigned_recruiter: string | null
          candidate_id: string
          created_at: string
          created_by: string | null
          hiring_manager_feedback: string | null
          id: string
          rejection_reason: string | null
          score: number | null
          stage: Database["public"]["Enums"]["pipeline_stage"]
          updated_at: string
          vacancy_id: string
        }
        Insert: {
          assigned_recruiter?: string | null
          candidate_id: string
          created_at?: string
          created_by?: string | null
          hiring_manager_feedback?: string | null
          id?: string
          rejection_reason?: string | null
          score?: number | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          updated_at?: string
          vacancy_id: string
        }
        Update: {
          assigned_recruiter?: string | null
          candidate_id?: string
          created_at?: string
          created_by?: string | null
          hiring_manager_feedback?: string | null
          id?: string
          rejection_reason?: string | null
          score?: number | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          updated_at?: string
          vacancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_applications_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          created_at: string
          created_by: string | null
          current_company: string | null
          current_ctc: number | null
          current_title: string | null
          email: string | null
          expected_ctc: number | null
          full_name: string
          id: string
          linkedin_url: string | null
          location: string | null
          notes: string | null
          notice_period_days: number | null
          phone: string | null
          resume_url: string | null
          skills: string[] | null
          source: string | null
          total_experience: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_company?: string | null
          current_ctc?: number | null
          current_title?: string | null
          email?: string | null
          expected_ctc?: number | null
          full_name: string
          id?: string
          linkedin_url?: string | null
          location?: string | null
          notes?: string | null
          notice_period_days?: number | null
          phone?: string | null
          resume_url?: string | null
          skills?: string[] | null
          source?: string | null
          total_experience?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_company?: string | null
          current_ctc?: number | null
          current_title?: string | null
          email?: string | null
          expected_ctc?: number | null
          full_name?: string
          id?: string
          linkedin_url?: string | null
          location?: string | null
          notes?: string | null
          notice_period_days?: number | null
          phone?: string | null
          resume_url?: string | null
          skills?: string[] | null
          source?: string | null
          total_experience?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          contact_email: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          kind: string
          vacancy_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          kind?: string
          vacancy_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          kind?: string
          vacancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          provider_message_id: string | null
          recipient_email: string
          recipient_user_id: string | null
          status: string
          template: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          provider_message_id?: string | null
          recipient_email: string
          recipient_user_id?: string | null
          status?: string
          template: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          provider_message_id?: string | null
          recipient_email?: string
          recipient_user_id?: string | null
          status?: string
          template?: string
        }
        Relationships: []
      }
      extensions: {
        Row: {
          approval_notes: string | null
          approved_at: string
          approved_by: string | null
          extended_date: string
          id: string
          original_date: string
          reason: string
          vacancy_id: string
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string
          approved_by?: string | null
          extended_date: string
          id?: string
          original_date: string
          reason: string
          vacancy_id: string
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string
          approved_by?: string | null
          extended_date?: string
          id?: string
          original_date?: string
          reason?: string
          vacancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extensions_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          application_id: string
          cancellation_reason: string | null
          created_at: string
          created_by: string
          duration_minutes: number
          external_link: string | null
          feedback: string | null
          id: string
          interviewer_ids: string[]
          mode: string
          rating: number | null
          room_id: string
          round_name: string | null
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          application_id: string
          cancellation_reason?: string | null
          created_at?: string
          created_by: string
          duration_minutes?: number
          external_link?: string | null
          feedback?: string | null
          id?: string
          interviewer_ids?: string[]
          mode?: string
          rating?: number | null
          room_id?: string
          round_name?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string
          duration_minutes?: number
          external_link?: string | null
          feedback?: string | null
          id?: string
          interviewer_ids?: string[]
          mode?: string
          rating?: number | null
          room_id?: string
          round_name?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "candidate_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          error: string | null
          id: string
          payload: Json
          recipient_email: string
          recipient_user_id: string | null
          sent_at: string | null
          status: string
          template: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          recipient_email: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          template: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          recipient_email?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          template?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          last_login_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          last_login_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      replacement_employees: {
        Row: {
          created_at: string
          deployment_deadline: string | null
          early_relieving_date: string | null
          employee_code: string | null
          employee_name: string
          id: string
          last_working_date: string
          notice_period_days: number
          resignation_date: string
          updated_at: string
          vacancy_id: string
        }
        Insert: {
          created_at?: string
          deployment_deadline?: string | null
          early_relieving_date?: string | null
          employee_code?: string | null
          employee_name: string
          id?: string
          last_working_date: string
          notice_period_days?: number
          resignation_date: string
          updated_at?: string
          vacancy_id: string
        }
        Update: {
          created_at?: string
          deployment_deadline?: string | null
          early_relieving_date?: string | null
          employee_code?: string | null
          employee_name?: string
          id?: string
          last_working_date?: string
          notice_period_days?: number
          resignation_date?: string
          updated_at?: string
          vacancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "replacement_employees_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: true
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_history: {
        Row: {
          application_id: string
          changed_by: string | null
          created_at: string
          from_stage: Database["public"]["Enums"]["pipeline_stage"] | null
          id: string
          note: string | null
          to_stage: Database["public"]["Enums"]["pipeline_stage"]
        }
        Insert: {
          application_id: string
          changed_by?: string | null
          created_at?: string
          from_stage?: Database["public"]["Enums"]["pipeline_stage"] | null
          id?: string
          note?: string | null
          to_stage: Database["public"]["Enums"]["pipeline_stage"]
        }
        Update: {
          application_id?: string
          changed_by?: string | null
          created_at?: string
          from_stage?: Database["public"]["Enums"]["pipeline_stage"] | null
          id?: string
          note?: string | null
          to_stage?: Database["public"]["Enums"]["pipeline_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "stage_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "candidate_applications"
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
          role: Database["public"]["Enums"]["app_role"]
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
      vacancies: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          experience_max: number | null
          experience_min: number | null
          hiring_manager_id: string | null
          id: string
          level: Database["public"]["Enums"]["vacancy_level"]
          location: string | null
          openings: number
          recruitment_manager_id: string | null
          role: string
          skills: string[]
          status: Database["public"]["Enums"]["vacancy_status"]
          target_hiring_date: string | null
          updated_at: string
          vacancy_type: Database["public"]["Enums"]["vacancy_type"]
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          experience_max?: number | null
          experience_min?: number | null
          hiring_manager_id?: string | null
          id?: string
          level?: Database["public"]["Enums"]["vacancy_level"]
          location?: string | null
          openings?: number
          recruitment_manager_id?: string | null
          role: string
          skills?: string[]
          status?: Database["public"]["Enums"]["vacancy_status"]
          target_hiring_date?: string | null
          updated_at?: string
          vacancy_type?: Database["public"]["Enums"]["vacancy_type"]
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          experience_max?: number | null
          experience_min?: number | null
          hiring_manager_id?: string | null
          id?: string
          level?: Database["public"]["Enums"]["vacancy_level"]
          location?: string | null
          openings?: number
          recruitment_manager_id?: string | null
          role?: string
          skills?: string[]
          status?: Database["public"]["Enums"]["vacancy_status"]
          target_hiring_date?: string | null
          updated_at?: string
          vacancy_type?: Database["public"]["Enums"]["vacancy_type"]
        }
        Relationships: [
          {
            foreignKeyName: "vacancies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "hr_admin"
        | "recruitment_manager"
        | "recruiter"
        | "hiring_manager"
        | "candidate"
      pipeline_stage:
        | "sourcing"
        | "screening"
        | "submitted"
        | "interviewing"
        | "offered"
        | "joined"
        | "rejected"
        | "on_hold"
      vacancy_level: "L1" | "L2" | "L3" | "L4"
      vacancy_status:
        | "open"
        | "in_progress"
        | "on_hold"
        | "closed"
        | "cancelled"
      vacancy_type: "new_requirement" | "replacement"
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
      app_role: [
        "hr_admin",
        "recruitment_manager",
        "recruiter",
        "hiring_manager",
        "candidate",
      ],
      pipeline_stage: [
        "sourcing",
        "screening",
        "submitted",
        "interviewing",
        "offered",
        "joined",
        "rejected",
        "on_hold",
      ],
      vacancy_level: ["L1", "L2", "L3", "L4"],
      vacancy_status: ["open", "in_progress", "on_hold", "closed", "cancelled"],
      vacancy_type: ["new_requirement", "replacement"],
    },
  },
} as const
