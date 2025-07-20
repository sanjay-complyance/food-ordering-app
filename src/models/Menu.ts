import mongoose, { Schema, Model } from "mongoose";
import { IMenu, IMenuItem } from "@/types/models";

const MenuItemSchema = new Schema<IMenuItem>(
  {
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
    price: {
      type: Number,
      min: [0, "Price cannot be negative"],
      validate: {
        validator: function (value: number) {
          return value === undefined || value >= 0;
        },
        message: "Price must be a positive number",
      },
    },
    available: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const MenuSchema = new Schema<IMenu>(
  {
    name: {
      type: String,
      required: [true, "Menu name is required"],
      trim: true,
      maxlength: [100, "Menu name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Menu description cannot exceed 500 characters"],
    },
    items: {
      type: [MenuItemSchema],
      required: [true, "Menu must have at least one item"],
      validate: {
        validator: function (items: IMenuItem[]) {
          return items.length > 0;
        },
        message: "Menu must contain at least one item",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Menu creator is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
MenuSchema.index({ isActive: 1 });
MenuSchema.index({ createdBy: 1 });
MenuSchema.index({ createdAt: -1 });

const Menu: Model<IMenu> =
  mongoose.models.Menu || mongoose.model<IMenu>("Menu", MenuSchema);

export default Menu;
