"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useToast } from "@/lib/toast";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface OrderItem {
  name: string;
  description: string;
  quantity: number;
}

interface Order {
  _id: string;
  userId: string;
  userName: string;
  orderDate: string;
  items: OrderItem[];
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

interface OrderSummary {
  menuItemName: string;
  menuItemDescription: string;
  totalQuantity: number;
  orderCount: number;
  users: string[];
}

export default function OrdersView() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportText, setExportText] = useState("");

  // Fetch orders on component mount and when selectedDate changes
  useEffect(() => {
    fetchOrders();
  }, [selectedDate]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/orders?date=${selectedDate}`);

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const processOrders = async () => {
    if (
      !confirm(
        "Are you sure you want to process all orders? This will prevent users from modifying their orders."
      )
    ) {
      return;
    }

    try {
      setIsProcessing(true);
      const response = await fetch("/api/admin/orders/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ date: selectedDate }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          variant: "success",
          title: "Success",
          description: "Orders processed successfully!",
        });
        fetchOrders();
      } else {
        console.error("Failed to process orders:", data.error);
        toast({
          variant: "destructive",
          title: "Failed to process orders",
          description: data.error,
        });
      }
    } catch (error) {
      console.error("Error processing orders:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusChange = async (
    orderId: string,
    newStatus: "pending" | "confirmed" | "cancelled"
  ) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          variant: "success",
          title: "Success",
          description: `Order status updated to ${newStatus}`,
        });
        fetchOrders();
      } else {
        console.error("Failed to update order status:", data.error);
        toast({
          variant: "destructive",
          title: "Failed to update order status",
          description: data.error,
        });
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateOrderSummary = (): OrderSummary[] => {
    const summary: Record<string, OrderSummary> = {};

    orders.forEach((order) => {
      if (order.status === "confirmed" || order.status === "pending") {
        if (order.items && Array.isArray(order.items)) {
          // New format with items array
          order.items.forEach((item) => {
            const key = item.name;

            if (!summary[key]) {
              summary[key] = {
                menuItemName: item.name,
                menuItemDescription: item.description,
                totalQuantity: 0,
                orderCount: 0,
                users: [],
              };
            }

            summary[key].totalQuantity += item.quantity;
            summary[key].orderCount += 1;
            if (!summary[key].users.includes(order.userName)) {
              summary[key].users.push(order.userName);
            }
          });
        } else {
          // Legacy format with single item
          const key = (order as any).menuItemName || 'Unknown Item';
          const description = (order as any).menuItemDescription || 'No description';

          if (!summary[key]) {
            summary[key] = {
              menuItemName: key,
              menuItemDescription: description,
              totalQuantity: 0,
              orderCount: 0,
              users: [],
            };
          }

          summary[key].totalQuantity += 1;
          summary[key].orderCount += 1;
          if (!summary[key].users.includes(order.userName)) {
            summary[key].users.push(order.userName);
          }
        }
      }
    });

    return Object.values(summary);
  };

  const exportOrders = () => {
    const summary = generateOrderSummary();
    const date = new Date(selectedDate).toLocaleDateString();

    let text = `Daily Lunch Orders - ${date}\n\n`;

    summary.forEach((item) => {
      text += `${item.menuItemName} (${item.totalQuantity} total, ${item.orderCount} orders)\n`;
      text += `Description: ${item.menuItemDescription}\n`;
      text += `Ordered by: ${item.users.join(", ")}\n\n`;
    });

    const totalOrders = orders.filter((o) => o.status === "confirmed" || o.status === "pending").length;
    const totalItems = orders
      .filter((o) => o.status === "confirmed" || o.status === "pending")
      .reduce((sum, order) => {
        if (order.items && Array.isArray(order.items)) {
          return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
        } else {
          return sum + 1; // Legacy orders had single items
        }
      }, 0);

    text += `\nTotal Orders: ${totalOrders}`;
    text += `\nTotal Items: ${totalItems}`;
    text += `\nGenerated on: ${new Date().toLocaleString()}`;

    setExportText(text);
    setIsExportDialogOpen(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(exportText)
      .then(() => {
        toast({
          variant: "success",
          title: "Success",
          description: "Copied to clipboard!",
        });
        setIsExportDialogOpen(false);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to copy to clipboard",
        });
      });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "confirmed":
        return "success";
      case "cancelled":
        return "destructive";
      default:
        return "warning";
    }
  };

  if (!isAdmin) {
    return <div>Unauthorized</div>;
  }

  const orderSummary = generateOrderSummary();
  const hasOrders = orders.length > 0;
  // Only disable if all orders are cancelled (not confirmed)
  const allOrdersCancelled = orders.every(
    (order) => order.status === "cancelled"
  );

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Orders View</h2>
        <div className="flex items-center gap-4">
          <div className="relative z-10">
            <Label htmlFor="date-select">Date</Label>
            <Input
              id="date-select"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <Button
            onClick={exportOrders}
            variant="outline"
            disabled={!hasOrders}
          >
            Export
          </Button>
          <Button
            onClick={processOrders}
            disabled={isProcessing || !hasOrders || allOrdersCancelled}
          >
            {isProcessing ? "Processing..." : "Process Orders"}
          </Button>
        </div>
      </div>

      {isLoading && <p>Loading orders...</p>}

      {!isLoading && !hasOrders && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            No orders found for the selected date.
          </p>
        </div>
      )}

      {!isLoading && hasOrders && (
        <>
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Order Summary</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Total Quantity</TableHead>
                  <TableHead>Order Count</TableHead>
                  <TableHead>Users</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderSummary.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {item.menuItemName}
                    </TableCell>
                    <TableCell>{item.menuItemDescription}</TableCell>
                    <TableCell>{item.totalQuantity}</TableCell>
                    <TableCell>{item.orderCount}</TableCell>
                    <TableCell>{item.users.join(", ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <h3 className="text-xl font-semibold mb-4">Individual Orders</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order Time</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order._id}>
                  <TableCell>{order.userName}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {order.items && Array.isArray(order.items) ? (
                        // New format with items array
                        order.items.map((item, index) => (
                          <div key={index} className="text-sm">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-gray-500 ml-2">
                              ({item.quantity}x)
                            </span>
                            <div className="text-xs text-gray-400">
                              {item.description}
                            </div>
                          </div>
                        ))
                      ) : (
                        // Legacy format with single item
                        <div className="text-sm">
                          <span className="font-medium">{(order as any).menuItemName || 'Unknown Item'}</span>
                          <span className="text-gray-500 ml-2">
                            (1x)
                          </span>
                          <div className="text-xs text-gray-400">
                            {(order as any).menuItemDescription || 'No description'}
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(order.status)}>
                      {order.status.charAt(0).toUpperCase() +
                        order.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(order.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {order.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-500 hover:text-green-700"
                            onClick={() =>
                              handleStatusChange(order._id, "confirmed")
                            }
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() =>
                              handleStatusChange(order._id, "cancelled")
                            }
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {order.status === "confirmed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() =>
                            handleStatusChange(order._id, "cancelled")
                          }
                        >
                          Cancel
                        </Button>
                      )}
                      {order.status === "cancelled" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-500 hover:text-green-700"
                          onClick={() =>
                            handleStatusChange(order._id, "confirmed")
                          }
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Orders</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96 whitespace-pre-wrap">
              {exportText}
            </pre>
          </div>
          <DialogFooter>
            <Button onClick={copyToClipboard}>Copy to Clipboard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
