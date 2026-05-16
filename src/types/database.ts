// TypeScript types matching the Supabase schema.
// Keep in sync with supabase/migrations/*.sql

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ─── Enums ────────────────────────────────────────────────────────────────────

export type OrderType           = 'tasting_voucher' | 'value_voucher' | 'gift_box' | 'mixed'
export type OrderStatus         = 'inquiry' | 'payment_open' | 'paid' | 'in_preparation' | 'ready' | 'completed' | 'cancelled' | 'refunded'
export type PaymentStatus       = 'open' | 'paid' | 'cancelled' | 'refunded'
export type ProductType         = 'tasting_voucher' | 'value_voucher' | 'gift_box'
export type VoucherStatus       = 'pending' | 'active' | 'redemption_requested' | 'date_confirmed' | 'redeemed' | 'expired' | 'cancelled'
export type RedemptionStatus    = 'pending' | 'under_review' | 'date_confirmed' | 'alternative_proposed' | 'completed' | 'rejected'
export type BookingType         = 'voucher_redemption' | 'in_store'
export type BookingStatus       = 'confirmed' | 'cancelled'
export type GroupRequestStatus  = 'new' | 'reviewing' | 'offer_sent' | 'confirmed' | 'rejected' | 'completed'

// ─── Database shape (Supabase client generic) ─────────────────────────────────

export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          customer_id: string | null
          order_type: OrderType
          status: OrderStatus
          payment_status: PaymentStatus
          total_amount: number
          source: string
          internal_ref: string | null
          notes: string | null
          paid_at: string | null
          stripe_session_id: string | null
          stripe_payment_intent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          order_type: OrderType
          status?: OrderStatus
          payment_status?: PaymentStatus
          total_amount?: number
          source?: string
          internal_ref?: string | null
          notes?: string | null
          paid_at?: string | null
          stripe_session_id?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          order_type?: OrderType
          status?: OrderStatus
          payment_status?: PaymentStatus
          total_amount?: number
          source?: string
          internal_ref?: string | null
          notes?: string | null
          paid_at?: string | null
          stripe_session_id?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_type: ProductType
          product_name: string
          variant: string | null
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_type: ProductType
          product_name: string
          variant?: string | null
          quantity?: number
          unit_price: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_type?: ProductType
          product_name?: string
          variant?: string | null
          quantity?: number
          unit_price?: number
          created_at?: string
        }
      }
      vouchers: {
        Row: {
          id: string
          order_id: string
          order_item_id: string | null
          code: string | null
          voucher_type: 'tasting_voucher' | 'value_voucher'
          product_name: string
          variant: string | null
          persons_allowed: number | null
          value_amount: number | null
          status: VoucherStatus
          valid_until: string | null
          generated_at: string | null
          sent_at: string | null
          redeemed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          order_item_id?: string | null
          code?: string | null
          voucher_type: 'tasting_voucher' | 'value_voucher'
          product_name: string
          variant?: string | null
          persons_allowed?: number | null
          value_amount?: number | null
          status?: VoucherStatus
          valid_until?: string | null
          generated_at?: string | null
          sent_at?: string | null
          redeemed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          order_item_id?: string | null
          code?: string | null
          voucher_type?: 'tasting_voucher' | 'value_voucher'
          product_name?: string
          variant?: string | null
          persons_allowed?: number | null
          value_amount?: number | null
          status?: VoucherStatus
          valid_until?: string | null
          generated_at?: string | null
          sent_at?: string | null
          redeemed_at?: string | null
          created_at?: string
        }
      }
      redemption_requests: {
        Row: {
          id: string
          voucher_id: string
          customer_name: string
          customer_email: string | null
          customer_phone: string | null
          requested_persons: number
          preferred_date_1: string | null
          preferred_time_1: string | null
          preferred_date_2: string | null
          preferred_time_2: string | null
          preferred_date_3: string | null
          preferred_time_3: string | null
          message: string | null
          status: RedemptionStatus
          confirmed_date: string | null
          admin_notes: string | null
          tasting_event_id: string | null
          tasting_booking_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          voucher_id: string
          customer_name: string
          customer_email?: string | null
          customer_phone?: string | null
          requested_persons: number
          preferred_date_1?: string | null
          preferred_time_1?: string | null
          preferred_date_2?: string | null
          preferred_time_2?: string | null
          preferred_date_3?: string | null
          preferred_time_3?: string | null
          message?: string | null
          status?: RedemptionStatus
          confirmed_date?: string | null
          admin_notes?: string | null
          tasting_event_id?: string | null
          tasting_booking_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          voucher_id?: string
          customer_name?: string
          customer_email?: string | null
          customer_phone?: string | null
          requested_persons?: number
          preferred_date_1?: string | null
          preferred_time_1?: string | null
          preferred_date_2?: string | null
          preferred_time_2?: string | null
          preferred_date_3?: string | null
          preferred_time_3?: string | null
          message?: string | null
          status?: RedemptionStatus
          confirmed_date?: string | null
          admin_notes?: string | null
          tasting_event_id?: string | null
          tasting_booking_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      internal_notes: {
        Row: {
          id: string
          order_id: string | null
          voucher_id: string | null
          redemption_request_id: string | null
          note: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          order_id?: string | null
          voucher_id?: string | null
          redemption_request_id?: string | null
          note: string
          created_by?: string
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string | null
          voucher_id?: string | null
          redemption_request_id?: string | null
          note?: string
          created_by?: string
          created_at?: string
        }
      }
      tasting_events: {
        Row: {
          id: string
          tasting_name: string
          event_date: string
          start_time: string
          own_quota: number
          franchise_quota: number
          franchise_booked: number
          is_open: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tasting_name: string
          event_date: string
          start_time: string
          own_quota?: number
          franchise_quota?: number
          franchise_booked?: number
          is_open?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tasting_name?: string
          event_date?: string
          start_time?: string
          own_quota?: number
          franchise_quota?: number
          franchise_booked?: number
          is_open?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tasting_bookings: {
        Row: {
          id: string
          tasting_event_id: string
          voucher_id: string | null
          redemption_request_id: string | null
          booking_type: BookingType
          customer_name: string
          customer_email: string | null
          customer_phone: string | null
          persons: number
          status: BookingStatus
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tasting_event_id: string
          voucher_id?: string | null
          redemption_request_id?: string | null
          booking_type: BookingType
          customer_name: string
          customer_email?: string | null
          customer_phone?: string | null
          persons: number
          status?: BookingStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tasting_event_id?: string
          voucher_id?: string | null
          redemption_request_id?: string | null
          booking_type?: BookingType
          customer_name?: string
          customer_email?: string | null
          customer_phone?: string | null
          persons?: number
          status?: BookingStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      group_requests: {
        Row: {
          id: string
          tasting_name: string
          customer_name: string
          customer_email: string
          customer_phone: string | null
          persons: number
          desired_period: string | null
          occasion: string | null
          message: string | null
          status: GroupRequestStatus
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tasting_name: string
          customer_name: string
          customer_email: string
          customer_phone?: string | null
          persons: number
          desired_period?: string | null
          occasion?: string | null
          message?: string | null
          status?: GroupRequestStatus
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tasting_name?: string
          customer_name?: string
          customer_email?: string
          customer_phone?: string | null
          persons?: number
          desired_period?: string | null
          occasion?: string | null
          message?: string | null
          status?: GroupRequestStatus
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      revenue_summary: {
        Row: {
          total_revenue: number
          revenue_this_month: number
          open_payments_amount: number
          open_payments_count: number
          cancelled_refunded_amount: number
          avg_order_value: number | null
          paid_orders_count: number
          open_inquiry_count: number
        }
      }
      revenue_by_category: {
        Row: {
          revenue_tasting_vouchers: number
          revenue_value_vouchers: number
          revenue_gift_boxes: number
        }
      }
    }
    Enums: {
      order_type: OrderType
      order_status: OrderStatus
      payment_status: PaymentStatus
      product_type: ProductType
      voucher_status: VoucherStatus
      redemption_status: RedemptionStatus
      booking_type: BookingType
      booking_status: BookingStatus
      group_request_status: GroupRequestStatus
    }
  }
}

// ─── Convenience row types ─────────────────────────────────────────────────────

export type Customer           = Database['public']['Tables']['customers']['Row']
export type CustomerInsert     = Database['public']['Tables']['customers']['Insert']
export type CustomerUpdate     = Database['public']['Tables']['customers']['Update']

export type Order              = Database['public']['Tables']['orders']['Row']
export type OrderInsert        = Database['public']['Tables']['orders']['Insert']
export type OrderUpdate        = Database['public']['Tables']['orders']['Update']

export type OrderItem          = Database['public']['Tables']['order_items']['Row']
export type OrderItemInsert    = Database['public']['Tables']['order_items']['Insert']
export type OrderItemUpdate    = Database['public']['Tables']['order_items']['Update']

export type Voucher            = Database['public']['Tables']['vouchers']['Row']
export type VoucherInsert      = Database['public']['Tables']['vouchers']['Insert']
export type VoucherUpdate      = Database['public']['Tables']['vouchers']['Update']

export type RedemptionRequest       = Database['public']['Tables']['redemption_requests']['Row']
export type RedemptionRequestInsert = Database['public']['Tables']['redemption_requests']['Insert']
export type RedemptionRequestUpdate = Database['public']['Tables']['redemption_requests']['Update']

export type InternalNote       = Database['public']['Tables']['internal_notes']['Row']
export type InternalNoteInsert = Database['public']['Tables']['internal_notes']['Insert']

export type TastingEvent       = Database['public']['Tables']['tasting_events']['Row']
export type TastingEventInsert = Database['public']['Tables']['tasting_events']['Insert']
export type TastingEventUpdate = Database['public']['Tables']['tasting_events']['Update']

export type TastingBooking       = Database['public']['Tables']['tasting_bookings']['Row']
export type TastingBookingInsert = Database['public']['Tables']['tasting_bookings']['Insert']
export type TastingBookingUpdate = Database['public']['Tables']['tasting_bookings']['Update']

export type GroupRequest       = Database['public']['Tables']['group_requests']['Row']
export type GroupRequestInsert = Database['public']['Tables']['group_requests']['Insert']
export type GroupRequestUpdate = Database['public']['Tables']['group_requests']['Update']

export type RevenueSummary     = Database['public']['Views']['revenue_summary']['Row']
export type RevenueByCategory  = Database['public']['Views']['revenue_by_category']['Row']
