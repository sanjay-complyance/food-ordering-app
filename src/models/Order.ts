import mongoose, { Schema, Model } from "mongoose";
import { IOrder, OrderStatus } from "@/types/models";

const OrderItemSchema = new Schema({
  name: {
    type: String,
    required: [true, "Menu item name is required"],
    trim: true,
    maxlength: [100, "Menu item name cannot exceed 100 characters"],
  },
  description: {
    type: String,
    required: [true, "Menu item description is required"],
    trim: true,
    maxlength: [500, "Menu item description cannot exceed 500 characters"],
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    min: [1, "Quantity must be at least 1"],
    max: [50, "Quantity cannot exceed 50"],
  },
});

const OrderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    orderDate: {
      type: Date,
      required: [true, "Order date is required"],
      validate: {
        validator: function (value: Date) {
          // Ensure order date is not in the past (allow today)
          const today = new Date();
          const todayStart = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));
          
          // Normalize the input value to start of day in UTC
          const orderDate = new Date(value);
          const orderDateStart = new Date(Date.UTC(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate(), 0, 0, 0, 0));
          
          console.log("Order validation - Input value:", value);
          console.log("Order validation - OrderDate start (UTC):", orderDateStart);
          console.log("Order validation - Today start (UTC):", todayStart);
          console.log("Order validation - Is valid:", orderDateStart >= todayStart);
          
          return orderDateStart >= todayStart;
        },
        message: "Order date cannot be in the past",
      },
    },
    items: {
      type: [OrderItemSchema],
      required: [true, "At least one item is required"],
      validate: {
        validator: function (items: { name: string; description: string; quantity: number }[]) {
          return items && items.length > 0;
        },
        message: "At least one item is required",
      },
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"] as OrderStatus[],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// Regular indexes for efficient queries (uniqueness handled in application logic)
OrderSchema.index({ userId: 1, orderDate: 1, status: 1 });
OrderSchema.index({ userId: 1, orderDate: 1 });
OrderSchema.index({ orderDate: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });

const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

export default Order;
