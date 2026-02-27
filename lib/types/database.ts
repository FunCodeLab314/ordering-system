// Matches Supabase schema exactly

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: 'Kakanin' | 'Suman' | 'Party Trays';
  image_url: string | null;
  image_public_id: string | null;
  is_best_seller: boolean;
  is_available: boolean;
  tags: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Cart {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  // Joined
  product?: Product;
}

export type OrderStatus = 'Pending' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
export type DeliveryMode = 'Delivery' | 'Pick-up';
export type PaymentMethod = 'COD' | 'GCash' | 'Maya';

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  delivery_mode: DeliveryMode;
  delivery_address: string | null;
  payment_method: PaymentMethod;
  payment_status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  scheduled_date: string | null;
  created_at: string;
  updated_at: string;
}
