import { Metadata } from "next";
import UserProfile from "@/components/user/UserProfile";

export const metadata: Metadata = {
  title: "User Profile | Daily Lunch Ordering",
  description: "Manage your profile and notification preferences",
};

export default function ProfilePage() {
  return (
    <div className="container mx-auto py-6">
      <UserProfile />
    </div>
  );
}
