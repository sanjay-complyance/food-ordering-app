"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IOrder } from "@/types/models";
import { Badge } from "@/components/ui/badge";

interface OrderHistoryProps {
  limit?: number;
  refreshTrigger?: number;
}

export function OrderHistory({ limit, refreshTrigger }: OrderHistoryProps) {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      // Only fetch today's orders for regular users
      const now = new Date();
      const today = now.getFullYear() + '-' + 
        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
        String(now.getDate()).padStart(2, '0');
      console.log("OrderHistory: Fetching orders for date:", today);
      const response = await fetch(`/api/orders?date=${today}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Error fetching orders: ${response.statusText}`);
      }

      const data = await response.json();
      setOrders(limit ? data.data.slice(0, limit) : data.data);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setError("Failed to load your order history. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    
    // Set up a refresh interval to check for new orders
    const intervalId = setInterval(fetchOrders, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [limit, refreshTrigger]);

  const handleCancelOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders?id=${orderId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to cancel order");
      }

      // Remove the cancelled order from the state
      setOrders(orders.filter((order) => order._id.toString() !== orderId));
    } catch (err) {
      console.error("Error cancelling order:", err);
      setError("Failed to cancel order. Please try again.");
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTotalItems = (order: IOrder) => {
    // Handle legacy orders that don't have items array yet
    if (!order.items || !Array.isArray(order.items)) {
      return 1; // Legacy orders had single items
    }
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  if (loading) {
    return (
      <Card className="w-full">
              <CardHeader>
        <CardTitle>Today&apos;s Order</CardTitle>
        <CardDescription>Loading your order for today...</CardDescription>
      </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
              <CardHeader>
        <CardTitle>Today&apos;s Order</CardTitle>
        <CardDescription>Error</CardDescription>
      </CardHeader>
        <CardContent>
          <div className="text-destructive">{error}</div>
        </CardContent>
      </Card>
    );
  }

  // Check if all orders are cancelled
  const hasActiveOrders = orders.some(order => order.status !== 'cancelled');
  const hasCancelledOrders = orders.some(order => order.status === 'cancelled');

  if (orders.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Today&apos;s Order</CardTitle>
          <CardDescription>Your order for today</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You haven&apos;t placed an order for today yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // If there are only cancelled orders, show a message that user can place a new order
  if (!hasActiveOrders && hasCancelledOrders) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Today&apos;s Order</CardTitle>
          <CardDescription>Your order for today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Your previous order was cancelled. You can place a new order for today.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> Since your order was cancelled, you can now place a new order for today.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Today&apos;s Order</CardTitle>
        <CardDescription>Your order for today</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order._id.toString()} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                                  <div className="flex items-center space-x-2">
                  <CardTitle className="text-base">
                    Order ({getTotalItems(order)} items)
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {order.items && Array.isArray(order.items) ? order.items.length : 1} {(order.items && Array.isArray(order.items) ? order.items.length : 1) === 1 ? 'item' : 'items'}
                  </Badge>
                </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-0.5 rounded ${getStatusBadgeClass(
                      order.status
                    )}`}
                  >
                    {order.status.charAt(0).toUpperCase() +
                      order.status.slice(1)}
                  </span>
                </div>
                <CardDescription className="text-sm">
                  {new Date(order.orderDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="space-y-2">
                  {order.items && Array.isArray(order.items) ? (
                    // New format with items array
                    order.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <div className="flex-1">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground ml-2">
                            ({item.quantity}x)
                          </span>
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {item.description}
                        </span>
                      </div>
                    ))
                  ) : (
                    // Legacy format with single item
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex-1">
                        <span className="font-medium">{(order as unknown as { menuItemName?: string }).menuItemName || 'Unknown Item'}</span>
                        <span className="text-muted-foreground ml-2">
                          (1x)
                        </span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {(order as unknown as { menuItemDescription?: string }).menuItemDescription || 'No description'}
                      </span>
                    </div>
                  )}
                </div>
                {order.status === "pending" && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive hover:bg-destructive/10"
                      onClick={() => handleCancelOrder(order._id.toString())}
                    >
                      Cancel Order
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
