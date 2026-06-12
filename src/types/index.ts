export type UserRole = 'student' | 'runner' | 'shopkeeper';

export type OrderStatus = 
  | 'pending' 
  | 'accepted' 
  | 'preparing' 
  | 'ready' 
  | 'picked' 
  | 'on_the_way' 
  | 'delivered' 
  | 'cancelled';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  location?: string;
  isVerified?: boolean;
  isOnline?: boolean;
  createdAt: Date;
}

export interface Shop {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  image: string;
  category: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  deliveryFee: number;
  isOpen: boolean;
  location: string;
}

export interface Product {
  id: string;
  shopId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isAvailable: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  studentId: string;
  studentName: string;
  studentLocation: string;
  shopId: string;
  shopName: string;
  shopLocation: string;
  runnerId?: string;
  runnerName?: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  rating?: number;
}

export interface Earnings {
  today: number;
  week: number;
  month: number;
  total: number;
  deliveries: number;
}

export interface DeliveryRequest {
  order: Order;
  distance: string;
  estimatedEarnings: number;
}
