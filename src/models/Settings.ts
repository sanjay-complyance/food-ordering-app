import mongoose, { Schema, Model, Document } from "mongoose";

export interface ISettings extends Document {
  menuUpdateReminderTime: string; // e.g., "11:00"
  orderReminderTime: string; // e.g., "10:30"
}

const SettingsSchema = new Schema<ISettings>({
  menuUpdateReminderTime: {
    type: String,
    required: true,
    default: "11:00",
  },
  orderReminderTime: {
    type: String,
    required: true,
    default: "10:30",
  },
});

const Settings =
  (mongoose.models.Settings as Model<ISettings>) || mongoose.model<ISettings>("Settings", SettingsSchema);

export default Settings; 