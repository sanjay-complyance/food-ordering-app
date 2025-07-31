import mongoose, { Schema, Model } from "mongoose";
import {
  IUser,
  UserRole,
  NotificationDeliveryMethod,
  NotificationFrequency,
} from "@/types/models";

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    role: {
      type: String,
      enum: ["user", "admin", "superuser"] as UserRole[],
      default: "user",
    },
    notificationPreferences: {
      orderReminders: {
        type: Boolean,
        default: true,
      },
      orderConfirmations: {
        type: Boolean,
        default: true,
      },
      orderModifications: {
        type: Boolean,
        default: true,
      },
      menuUpdates: {
        type: Boolean,
        default: true,
      },
      deliveryMethod: {
        type: String,
        enum: ["in_app", "email", "both"] as NotificationDeliveryMethod[],
        default: "in_app",
      },
      frequency: {
        type: String,
        enum: ["all", "important_only", "none"] as NotificationFrequency[],
        default: "all",
      },
    },
    pushSubscription: {
      type: Schema.Types.Mixed,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ createdAt: -1 });

// Prevent password from being returned in JSON
UserSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
