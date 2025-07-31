"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IMenuItem, IOrder } from "@/types/models";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading";
import { useToast } from "@/lib/toast";
import { orderSchema, type OrderFormData } from "@/lib/validations";
import { AlertCircle, Plus, Minus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useOrderQueue } from "@/hooks/usePWA";

interface OrderFormProps {
  selectedItems: IMenuItem[];
  onCancel: () => void;
  onSuccess: () => void;
}

export function OrderForm({
  selectedItems,
  onCancel,
  onSuccess,
}: OrderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { queue, addToQueue, syncQueue } = useOrderQueue();

  // Initialize form with selected items, each with quantity 1
  const initialItems = selectedItems.map(item => ({
    name: item.name,
    description: item.description,
    quantity: 1
  }));

  // Always get the current date on every render using local time
  const now = new Date();
  const today = now.getFullYear() + '-' + 
    String(now.getMonth() + 1).padStart(2, '0') + '-' + 
    String(now.getDate()).padStart(2, '0');
  console.log("OrderForm: Current time (UTC):", now.toISOString());
  console.log("OrderForm: Today's date (local):", today);
  console.log("OrderForm: Local date string:", now.toLocaleDateString());
  
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      orderDate: today,
      items: initialItems,
    },
  });

  // Force update the form value to current date
  form.setValue("orderDate", today);



  const { watch, setValue } = form;
  const watchedItems = watch("items");

  const updateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    if (newQuantity > 50) return;
    
    const updatedItems = [...watchedItems];
    updatedItems[index] = { ...updatedItems[index], quantity: newQuantity };
    setValue("items", updatedItems);
  };

  const removeItem = (index: number) => {
    const updatedItems = watchedItems.filter((_, i) => i !== index);
    setValue("items", updatedItems);
  };

  async function onSubmit(data: OrderFormData) {
    try {
      setIsSubmitting(true);
      setError(null);

      console.log("OrderForm: Submitting order with date:", data.orderDate);
      console.log("OrderForm: Today's date is:", today);
      console.log("OrderForm: Dates match?", data.orderDate === today);

      // Validate that order is for today only
      if (data.orderDate !== today) {
        setError(`Orders can only be placed for today's date (${today}).`);
        toast({
          variant: "destructive",
          title: "Invalid Date",
          description: `Orders can only be placed for today's date (${today}).`,
        });
        return;
      }

      // Check if user already has an order for today
      try {
        console.log("OrderForm: Checking for existing orders with date:", today);
        const checkResponse = await fetch(`/api/orders?date=${today}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        console.log("OrderForm: Check response status:", checkResponse.status);
        
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          console.log("OrderForm: Check data:", checkData);
          console.log("OrderForm: Found orders:", checkData.data?.length || 0);
          console.log("OrderForm: All orders:", checkData.data);
          
          // Filter out cancelled orders - only consider active orders
          console.log("OrderForm: Order statuses:", checkData.data?.map((order: IOrder) => ({ id: order._id, status: order.status, statusType: typeof order.status })));
          const activeOrders = checkData.data?.filter((order: IOrder) => {
            console.log("OrderForm: Checking order status:", order.status, "against 'cancelled'");
            return order.status !== 'cancelled';
          }) || [];
          console.log("OrderForm: Active orders (excluding cancelled):", activeOrders.length);
          console.log("OrderForm: Active order details:", activeOrders);
          
          if (activeOrders.length > 0) {
            console.log("OrderForm: Active order found:", activeOrders[0]);
            setError("You already have an active order for today.");
            toast({
              variant: "destructive",
              title: "Order Already Exists",
              description: "You already have an active order for today. You can modify your existing order instead.",
            });
            return;
          }
        }
      } catch (checkError) {
        console.error("Error checking existing orders:", checkError);
        // Continue with order placement even if check fails
      }

      if (!navigator.onLine) {
        addToQueue({
          id: Date.now().toString(),
          items: data.items
        });
        toast({
          variant: "success",
          title: "Order Queued",
          description: "You are offline. Your order has been queued and will be submitted when you're back online.",
        });
        onSuccess();
        return;
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.error || "Failed to place order";
        setError(errorMessage);
        
        // Show specific error messages based on the error
        if (result.error?.includes("already have an active order")) {
          toast({
            variant: "destructive",
            title: "Order Already Exists",
            description: "You already have an active order for today. You can modify your existing order instead.",
          });
        } else if (result.error?.includes("already have an order")) {
          toast({
            variant: "destructive",
            title: "Order Already Exists",
            description: "You already have an order for today. You can modify your existing order instead.",
          });
        } else if (result.error?.includes("Order date cannot be in the past")) {
          toast({
            variant: "destructive",
            title: "Invalid Order Date",
            description: "Orders can only be placed for today's date. Please try again.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Order Failed",
            description: errorMessage,
          });
        }
        return;
      }

      toast({
        variant: "success",
        title: "Order Placed Successfully!",
        description: `Your order for ${new Date().toLocaleDateString()} has been placed. Check "Today's Order" to see your order details.`,
      });
      onSuccess();
    } catch (err: unknown) {
      console.error("Error placing order:", err);
      const errorMessage =
        (err as Error).message || "Failed to place order. Please try again.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (selectedItems.length === 0) {
    return null;
  }

  const totalItems = watchedItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Confirm Your Order</CardTitle>
        <CardDescription>
          Review your selections and adjust quantities before confirming
        </CardDescription>
        <div className="text-xs text-gray-500">
          Component rendered at: {new Date().toLocaleString()}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form data-testid="order-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Order Date */}
            <FormField
              control={form.control}
              name="orderDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Order Date
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Today Only
                    </span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="date"
                        {...field}
                        min={today}
                        max={today}
                        value={today}
                        disabled={true}
                        className="bg-gray-50 cursor-not-allowed"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                                      <p className="text-xs text-gray-500 mt-1">
                      Orders can only be placed for today&apos;s date ({today})
                      <span className="ml-2 text-blue-600">• Updated: {new Date().toLocaleTimeString()}</span>
                      <br />
                      <span className="text-xs text-red-600">Debug: Local date {now.toLocaleDateString()} → {today}</span>
                    </p>
                </FormItem>
              )}
            />

            {/* Selected Items */}
            <div className="space-y-4">
              <FormLabel>Selected Items</FormLabel>
              {watchedItems.map((item, index) => (
                <Card key={index} className="p-4 border-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateItemQuantity(index, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        
                        <span className="w-12 text-center font-medium">
                          {item.quantity}
                        </span>
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateItemQuantity(index, item.quantity + 1)}
                          disabled={item.quantity >= 50}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {/* Remove Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Items:</span>
                <span className="font-bold text-lg">{totalItems}</span>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <div className="font-medium mb-1">Order Failed</div>
                  <div className="text-sm">{error}</div>
                  {error.includes("Order date cannot be in the past") && (
                    <div className="text-xs mt-2 p-2 bg-red-100 rounded">
                      <strong>Solution:</strong> The system automatically sets the order date to today. Please try placing your order again.
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || totalItems === 0}>
                {isSubmitting ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Placing Order...
                  </>
                ) : (
                  `Place Order (${totalItems} items)`
                )}
              </Button>
            </div>
          </form>
        </Form>
        {queue.length > 0 && (
          <div className="text-sm text-gray-500 mt-2">
            {queue.length} order(s) queued for submission.
            <button type="button" className="ml-2 underline" onClick={syncQueue}>
              Sync Now
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
