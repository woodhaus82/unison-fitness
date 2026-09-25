// Hand-written to match supabase/migrations/*.sql, and shaped to satisfy
// @supabase/postgrest-js's GenericSchema constraint (Tables need
// Relationships, the schema needs a Views map) — otherwise the whole
// `public` schema silently resolves to `never` and every query loses its
// types. If the schema drifts, regenerate with
// `supabase gen types typescript --local` once the CLI/DB are set up, and
// replace this file.

export type UserRole = "member" | "coach" | "admin";
export type BookingStatus =
  | "booked"
  | "waitlisted"
  | "cancelled"
  | "late_cancelled"
  | "attended"
  | "no_show";
export type SessionStatus = "scheduled" | "cancelled";
export type MembershipStatus = "active" | "paused" | "cancelled" | "expired";
export type UploadSource = "csv" | "xlsx" | "google_sheets";
export type UploadStatus = "processing" | "completed" | "failed";
export type NotificationType =
  | "booking_confirmation"
  | "waitlist_promoted"
  | "class_reminder"
  | "late_cancellation"
  | "missed_attendance"
  | "class_cancelled";

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          role: UserRole;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      class_types: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          color: string | null;
          default_capacity: number;
          late_cancel_cutoff_minutes: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["class_types"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["class_types"]["Row"]>;
        Relationships: [];
      };
      class_schedule: {
        Row: {
          id: string;
          class_type_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          capacity: number | null;
          coach_id: string | null;
          location: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["class_schedule"]["Row"]> & {
          class_type_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
        };
        Update: Partial<Database["public"]["Tables"]["class_schedule"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "class_schedule_class_type_id_fkey";
            columns: ["class_type_id"];
            isOneToOne: false;
            referencedRelation: "class_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_schedule_coach_id_fkey";
            columns: ["coach_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      class_sessions: {
        Row: {
          id: string;
          class_type_id: string;
          schedule_id: string | null;
          session_date: string;
          start_time: string;
          end_time: string;
          capacity: number;
          coach_id: string | null;
          location: string | null;
          status: SessionStatus;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["class_sessions"]["Row"]> & {
          class_type_id: string;
          session_date: string;
          start_time: string;
          end_time: string;
          capacity: number;
        };
        Update: Partial<Database["public"]["Tables"]["class_sessions"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "class_sessions_class_type_id_fkey";
            columns: ["class_type_id"];
            isOneToOne: false;
            referencedRelation: "class_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_sessions_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "class_schedule";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_sessions_coach_id_fkey";
            columns: ["coach_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      membership_plans: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          monthly_class_credits: number | null;
          price_cents: number | null;
          active: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["membership_plans"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["membership_plans"]["Row"]>;
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string | null;
          status: MembershipStatus;
          start_date: string;
          end_date: string | null;
          credits_remaining: number | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["memberships"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["memberships"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "membership_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          status: BookingStatus;
          waitlist_position: number | null;
          booked_at: string;
          cancelled_at: string | null;
          checked_in_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["bookings"]["Row"]> & {
          session_id: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "bookings_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "class_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_log: {
        Row: {
          id: string;
          user_id: string | null;
          booking_id: string | null;
          type: NotificationType;
          channel: string;
          sent_at: string;
          emailed_at: string | null;
          metadata: Record<string, unknown> | null;
        };
        Insert: Partial<Database["public"]["Tables"]["notification_log"]["Row"]> & {
          type: NotificationType;
        };
        Update: Partial<Database["public"]["Tables"]["notification_log"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "notification_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_log_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_uploads: {
        Row: {
          id: string;
          uploaded_by: string | null;
          source_type: UploadSource;
          file_name: string | null;
          row_count: number | null;
          status: UploadStatus;
          error_message: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["schedule_uploads"]["Row"]> & {
          source_type: UploadSource;
        };
        Update: Partial<Database["public"]["Tables"]["schedule_uploads"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "schedule_uploads_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      book_class: {
        Args: { p_session_id: string };
        Returns: Database["public"]["Tables"]["bookings"]["Row"];
      };
      cancel_booking: {
        Args: { p_booking_id: string };
        Returns: Database["public"]["Tables"]["bookings"]["Row"];
      };
      generate_sessions_from_schedule: {
        Args: { p_week_start: string };
        Returns: Database["public"]["Tables"]["class_sessions"]["Row"][];
      };
      mark_no_shows: {
        Args: Record<string, never>;
        Returns: Database["public"]["Tables"]["bookings"]["Row"][];
      };
      list_sessions: {
        Args: { p_from: string; p_to: string };
        Returns: {
          id: string;
          class_type_id: string;
          class_type_name: string;
          color: string | null;
          session_date: string;
          start_time: string;
          end_time: string;
          capacity: number;
          coach_id: string | null;
          coach_name: string | null;
          location: string | null;
          status: SessionStatus;
          booked_count: number;
          waitlist_count: number;
          my_booking_id: string | null;
          my_booking_status: BookingStatus | null;
          my_waitlist_position: number | null;
        }[];
      };
    };
  };
}
