import { Metadata } from "next";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { Header } from "@/components/layout/Header";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin Dashboard | Daily Lunch Ordering System",
  description: "Admin dashboard for managing menus, orders, and users",
};

export default async function AdminPage() {
  const session = await auth();

  // Check if user is authenticated and has admin privileges
  if (!session?.user) {
    redirect("/auth/login");
  }

  // Check if user has admin role (this is a backup to middleware protection)
  if (!["admin", "superuser"].includes(session.user.role)) {
    redirect("/unauthorized");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        <div className="container mx-auto py-8">
          <AdminDashboard />
        </div>
      </main>
    </div>
  );
}
