import mongoose, { Schema, Model, Document } from "mongoose";

export interface IInvite extends Document {
  email: string;
  token: string;
  status: "pending" | "accepted" | "expired";
  expiresAt: Date;
  createdAt: Date;
}

const InviteSchema = new Schema<IInvite>({
  email: { type: String, required: true, lowercase: true, trim: true },
  token: { type: String, required: true, unique: true },
  status: { type: String, enum: ["pending", "accepted", "expired"], default: "pending" },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

const Invite = (mongoose.models.Invite as Model<IInvite>) || mongoose.model<IInvite>("Invite", InviteSchema);

export default Invite; 