import { Document, ObjectId } from "mongoose";

// User role enum
export type UserRole = "user" | "admin" | "superuser";

// Order status enum
export type OrderStatus = "pending" | "confirmed" | "cancelled";

// Notification type enum
export type NotificationType =
  | "order_reminder"
  | "order_confirmed"
  | "order_modified"
  | "menu_updated";

// Notification delivery method enum
export type NotificationDeliveryMethod = "in_app" | "email" | "both";

// Notification frequency enum
export type NotificationFrequency = "all" | "important_only" | "none";

// Notification preferences interface
export interface INotificationPreferences {
  orderReminders: boolean;
  orderConfirmations: boolean;
  orderModifications: boolean;
  menuUpdates: boolean;
  deliveryMethod: NotificationDeliveryMethod;
  frequency: NotificationFrequency;
}

// Menu Item interface
export interface IMenuItem {
  name: string;
  description: string;
  price?: number;
  available: boolean;
}

// Order Item interface for multiple items
export interface IOrderItem {
  name: string;
  description: string;
  quantity: number;
}

// User interface
export interface PushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface IUser extends Document {
  _id: ObjectId;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  notificationPreferences: INotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
  pushSubscription?: PushSubscription;
}

// Menu interface
export interface IMenu extends Document {
  _id: ObjectId;
  name: string;
  description?: string;
  items: IMenuItem[];
  isActive: boolean;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Order interface - updated to support multiple items
export interface IOrder extends Document {
  _id: ObjectId;
  userId: ObjectId;
  orderDate: Date;
  items: IOrderItem[]; // Changed from single item to array of items
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Notification interface
export interface INotification extends Document {
  _id: ObjectId;
  userId?: ObjectId; // null for system-wide notifications
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: Date;
}
