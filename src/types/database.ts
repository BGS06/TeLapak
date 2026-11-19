/**
 * Tipe database TeLapak — mengikuti format `supabase gen types typescript`.
 * Regenerasi otomatis setelah migrasi berubah:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type UserRole = "member" | "admin";
type UserType = "student" | "lecturer" | "alumni";
type VerificationStatus = "pending" | "verified" | "rejected";
type ListingCategory =
  | "parfum"
  | "aksesoris"
  | "elektronik"
  | "buku"
  | "fashion"
  | "sepatu"
  | "kos"
  | "hobi"
  | "praktikum"
  | "lainnya";
type ListingCondition = "like_new" | "good" | "fair";
type ListingStatus = "active" | "reserved" | "sold" | "removed";
type OrderStatus =
  | "pending_payment"
  | "paid_held"
  | "completed"
  | "disputed"
  | "refunded"
  | "expired"
  | "cancelled";
type DisputeResolution = "pending" | "refund_buyer" | "release_seller";
type PayoutStatus = "pending_release" | "ready_to_payout" | "paid_out" | "cancelled";
type ReportStatus = "open" | "resolved" | "dismissed";
type MessageType = "text" | "offer" | "system";
type OfferStatus = "pending" | "accepted" | "rejected" | "superseded";

type OrderRow = {
  id: string;
  campus_id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  item_price_idr: number;
  platform_fee_idr: number;
  gateway_fee_idr: number;
  total_paid_idr: number;
  seller_net_idr: number;
  payment_provider: string;
  payment_reference: string | null;
  payment_url: string | null;
  status: OrderStatus;
  expires_at: string;
  paid_at: string | null;
  auto_release_at: string | null;
  reminder_sent_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
  created_at: string;
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      campuses: {
        Row: {
          id: string;
          name: string;
          slug: string;
          allowed_email_domains: string[];
          meeting_points: string[];
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          allowed_email_domains?: string[];
          meeting_points?: string[];
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          allowed_email_domains?: string[];
          meeting_points?: string[];
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          campus_id: string;
          email: string;
          full_name: string;
          role: UserRole;
          user_type: UserType;
          verification_status: VerificationStatus;
          verification_doc_url: string | null;
          verification_rejection_reason: string | null;
          whatsapp_number: string | null;
          payout_method: string | null;
          payout_account_number: string | null;
          payout_account_name: string | null;
          is_suspended: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          campus_id: string;
          email: string;
          full_name: string;
          role?: UserRole;
          user_type: UserType;
          verification_status?: VerificationStatus;
          verification_doc_url?: string | null;
          verification_rejection_reason?: string | null;
          whatsapp_number?: string | null;
          payout_method?: string | null;
          payout_account_number?: string | null;
          payout_account_name?: string | null;
          is_suspended?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campus_id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          user_type?: UserType;
          verification_status?: VerificationStatus;
          verification_doc_url?: string | null;
          verification_rejection_reason?: string | null;
          whatsapp_number?: string | null;
          payout_method?: string | null;
          payout_account_number?: string | null;
          payout_account_name?: string | null;
          is_suspended?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_campus_id_fkey";
            columns: ["campus_id"];
            isOneToOne: false;
            referencedRelation: "campuses";
            referencedColumns: ["id"];
          },
        ];
      };
      listings: {
        Row: {
          id: string;
          campus_id: string;
          seller_id: string;
          title: string;
          description: string;
          category: ListingCategory;
          condition: ListingCondition;
          price_idr: number;
          meeting_point: string;
          meeting_point_note: string | null;
          image_urls: string[];
          status: ListingStatus;
          taken_down_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campus_id: string;
          seller_id: string;
          title: string;
          description: string;
          category: ListingCategory;
          condition: ListingCondition;
          price_idr: number;
          meeting_point: string;
          meeting_point_note?: string | null;
          image_urls: string[];
          status?: ListingStatus;
          taken_down_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campus_id?: string;
          seller_id?: string;
          title?: string;
          description?: string;
          category?: ListingCategory;
          condition?: ListingCondition;
          price_idr?: number;
          meeting_point?: string;
          meeting_point_note?: string | null;
          image_urls?: string[];
          status?: ListingStatus;
          taken_down_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listings_campus_id_fkey";
            columns: ["campus_id"];
            isOneToOne: false;
            referencedRelation: "campuses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: OrderRow;
        Insert: Partial<OrderRow> & {
          campus_id: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          item_price_idr: number;
          platform_fee_idr: number;
          gateway_fee_idr: number;
          total_paid_idr: number;
          seller_net_idr: number;
          payment_provider: string;
        };
        Update: Partial<OrderRow>;
        Relationships: [
          {
            foreignKeyName: "orders_campus_id_fkey";
            columns: ["campus_id"];
            isOneToOne: false;
            referencedRelation: "campuses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      disputes: {
        Row: {
          id: string;
          order_id: string;
          opened_by: string;
          reason: string;
          evidence_urls: string[];
          resolution: DisputeResolution;
          admin_notes: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          opened_by: string;
          reason: string;
          evidence_urls?: string[];
          resolution?: DisputeResolution;
          admin_notes?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          opened_by?: string;
          reason?: string;
          evidence_urls?: string[];
          resolution?: DisputeResolution;
          admin_notes?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "disputes_opened_by_fkey";
            columns: ["opened_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payout_ledger: {
        Row: {
          id: string;
          order_id: string;
          seller_id: string;
          amount_idr: number;
          status: PayoutStatus;
          transfer_reference: string | null;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          seller_id: string;
          amount_idr: number;
          status?: PayoutStatus;
          transfer_reference?: string | null;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          seller_id?: string;
          amount_idr?: number;
          status?: PayoutStatus;
          transfer_reference?: string | null;
          paid_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payout_ledger_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payout_ledger_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_listing_id: string | null;
          target_user_id: string | null;
          reason: string;
          status: ReportStatus;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_listing_id?: string | null;
          target_user_id?: string | null;
          reason: string;
          status?: ReportStatus;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          target_listing_id?: string | null;
          target_user_id?: string | null;
          reason?: string;
          status?: ReportStatus;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_target_listing_id_fkey";
            columns: ["target_listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_target_user_id_fkey";
            columns: ["target_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          id: string;
          campus_id: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          accepted_offer_idr: number | null;
          last_message_text: string;
          last_message_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          campus_id: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          accepted_offer_idr?: number | null;
          last_message_text?: string;
          last_message_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          campus_id?: string;
          listing_id?: string;
          buyer_id?: string;
          seller_id?: string;
          accepted_offer_idr?: number | null;
          last_message_text?: string;
          last_message_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          message_type: MessageType;
          body: string;
          offer_amount_idr: number | null;
          offer_status: OfferStatus | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          message_type?: MessageType;
          body: string;
          offer_amount_idr?: number | null;
          offer_status?: OfferStatus | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          message_type?: MessageType;
          body?: string;
          offer_amount_idr?: number | null;
          offer_status?: OfferStatus | null;
          created_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          order_id: string;
          listing_id: string;
          seller_id: string;
          reviewer_id: string;
          rating: number;
          comment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          listing_id: string;
          seller_id: string;
          reviewer_id: string;
          rating: number;
          comment: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          listing_id?: string;
          seller_id?: string;
          reviewer_id?: string;
          rating?: number;
          comment?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      public_profiles: {
        Row: {
          id: string;
          campus_id: string;
          first_name: string;
          user_type: UserType;
          verification_status: VerificationStatus;
          created_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_active_member: { Args: Record<PropertyKey, never>; Returns: boolean };
      current_campus_id: { Args: Record<PropertyKey, never>; Returns: string };
      can_sell: { Args: { p_user_id: string }; Returns: boolean };
      get_seller_contact: {
        Args: { p_order_id: string };
        Returns: { full_name: string; whatsapp_number: string | null }[];
      };
      create_order: {
        Args: {
          p_buyer_id: string;
          p_listing_id: string;
          p_platform_fee_bps: number;
          p_gateway_fee_bps: number;
          p_provider: string;
          p_payment_ttl?: string;
        };
        Returns: OrderRow;
      };
      mark_order_paid: {
        Args: { p_order_id: string; p_payment_reference: string | null };
        Returns: string;
      };
      mark_late_payment_refunded: { Args: { p_order_id: string }; Returns: undefined };
      cancel_order: { Args: { p_order_id: string; p_actor: string }; Returns: undefined };
      expire_unpaid_orders: { Args: Record<PropertyKey, never>; Returns: number };
      confirm_order_received: { Args: { p_order_id: string; p_actor: string }; Returns: undefined };
      auto_release_orders: { Args: Record<PropertyKey, never>; Returns: string[] };
      open_dispute: {
        Args: { p_order_id: string; p_actor: string; p_reason: string; p_evidence?: string[] };
        Returns: string;
      };
      add_dispute_evidence: {
        Args: { p_order_id: string; p_actor: string; p_paths: string[] };
        Returns: undefined;
      };
      resolve_dispute: {
        Args: {
          p_order_id: string;
          p_admin: string;
          p_resolution: DisputeResolution;
          p_admin_notes: string;
          p_remove_listing?: boolean;
        };
        Returns: undefined;
      };
      mark_payout_paid: {
        Args: { p_seller_id: string; p_admin: string; p_transfer_reference: string };
        Returns: { total_idr: number; entry_count: number }[];
      };
      moderate_report: {
        Args: { p_report_id: string; p_admin: string; p_action: string };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: UserRole;
      user_type: UserType;
      verification_status: VerificationStatus;
      listing_category: ListingCategory;
      listing_condition: ListingCondition;
      listing_status: ListingStatus;
      order_status: OrderStatus;
      dispute_resolution: DisputeResolution;
      payout_status: PayoutStatus;
      report_status: ReportStatus;
      message_type: MessageType;
      offer_status: OfferStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export type Campus = Tables<"campuses">;
export type Profile = Tables<"profiles">;
export type Listing = Tables<"listings">;
export type Order = Tables<"orders">;
export type Dispute = Tables<"disputes">;
export type PayoutEntry = Tables<"payout_ledger">;
export type Report = Tables<"reports">;
export type Conversation = Tables<"conversations">;
export type Message = Tables<"messages">;
export type Review = Tables<"reviews">;
export type PublicProfile = Views<"public_profiles">;
