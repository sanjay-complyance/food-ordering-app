"use client";

import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import MenuManager from "./MenuManager";
import OrdersView from "./OrdersView";
import UserManager from "./UserManager";

export default function AdminDashboard() {
  const { isAdmin, isSuperuser } = useAuth();
  const [activeTab, setActiveTab] = useState<"orders" | "menu" | "users">(
    "orders"
  );

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Unauthorized</h2>
          <p className="mt-2 text-gray-600">
            You do not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="text-sm text-gray-500">
          Logged in as {isSuperuser ? "Superuser" : "Admin"}
        </div>
      </div>

      <div className="flex border-b">
        <Button
          variant={activeTab === "orders" ? "default" : "ghost"}
          className={`rounded-none ${
            activeTab === "orders" ? "" : "hover:text-primary"
          }`}
          onClick={() => setActiveTab("orders")}
        >
          Orders
        </Button>
        <Button
          variant={activeTab === "menu" ? "default" : "ghost"}
          className={`rounded-none ${
            activeTab === "menu" ? "" : "hover:text-primary"
          }`}
          onClick={() => setActiveTab("menu")}
        >
          Menu Management
        </Button>
        {isSuperuser && (
          <Button
            variant={activeTab === "users" ? "default" : "ghost"}
            className={`rounded-none ${
              activeTab === "users" ? "" : "hover:text-primary"
            }`}
            onClick={() => setActiveTab("users")}
          >
            User Management
          </Button>
        )}
      </div>

      <div className="mt-6">
        {activeTab === "orders" && <OrdersView />}
        {activeTab === "menu" && <MenuManager />}
        {activeTab === "users" && isSuperuser && <UserManager />}
      </div>

      <div className="mt-8">
        <Card className="p-6 bg-gray-50">
          <h2 className="text-xl font-semibold mb-4">Admin Quick Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-sm text-gray-500">Today's Orders</div>
              <div className="text-2xl font-bold mt-1">--</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-sm text-gray-500">Active Users</div>
              <div className="text-2xl font-bold mt-1">--</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-sm text-gray-500">Menu Items</div>
              <div className="text-2xl font-bold mt-1">--</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
