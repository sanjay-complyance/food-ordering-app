import { z } from "zod";

// Auth validation schemas
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters"),
});

// Menu validation schemas
export const menuItemSchema = z.object({
  name: z
    .string()
    .min(1, "Item name is required")
    .max(100, "Item name must be less than 100 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters"),
  price: z
    .number()
    .optional()
    .refine((val) => val === undefined || val >= 0, {
      message: "Price must be a positive number",
    }),
  available: z.boolean().default(true),
});

export const menuSchema = z.object({
  date: z
    .string()
    .min(1, "Date is required")
    .refine((date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }, "Please enter a valid date"),
  items: z
    .array(menuItemSchema)
    .min(1, "At least one menu item is required")
    .max(20, "Maximum 20 menu items allowed"),
});

// Order validation schemas
export const orderItemSchema = z.object({
  name: z.string().min(1, "Menu item name is required"),
  description: z.string().min(1, "Menu item description is required"),
  quantity: z.number().min(1, "Quantity must be at least 1").max(50, "Quantity cannot exceed 50"),
});

export const orderSchema = z.object({
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
  orderDate: z
    .string()
    .min(1, "Order date is required")
    .refine((date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }, "Please enter a valid date"),
});

// User management validation schemas
export const userRoleSchema = z.object({
  role: z.enum(["user", "admin", "superuser"], {
    message: "Please select a valid role",
  }),
});

// Notification validation schemas
export const notificationSchema = z.object({
  type: z.enum([
    "order_reminder",
    "order_confirmed",
    "order_modified",
    "menu_updated",
  ]),
  message: z
    .string()
    .min(1, "Message is required")
    .max(500, "Message must be less than 500 characters"),
  userId: z.string().optional(),
});

// API response validation schemas
export const apiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
  data: z.any().optional(),
});

// Export types
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type MenuFormData = z.infer<typeof menuSchema>;
export type MenuItemFormData = z.infer<typeof menuItemSchema>;
export type OrderFormData = z.infer<typeof orderSchema>;
export type UserRoleFormData = z.infer<typeof userRoleSchema>;
export type NotificationFormData = z.infer<typeof notificationSchema>;
export type ApiResponse = z.infer<typeof apiResponseSchema>;
