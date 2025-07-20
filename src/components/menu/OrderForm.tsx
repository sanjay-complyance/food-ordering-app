"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IMenuItem } from "@/types/models";
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
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading";
import { useToast } from "@/lib/toast";
import { orderSchema, type OrderFormData } from "@/lib/validations";
import { AlertCircle, Plus, Minus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

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

  // Initialize form with selected items, each with quantity 1
  const initialItems = selectedItems.map(item => ({
    name: item.name,
    description: item.description,
    quantity: 1
  }));

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      orderDate: new Date().toISOString().split("T")[0],
      items: initialItems,
    },
  });

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
        toast({
          variant: "destructive",
          title: "Order Failed",
          description: errorMessage,
        });
        return;
      }

      toast({
        variant: "success",
        title: "Order Placed",
        description: "Your lunch order has been placed successfully!",
      });
      onSuccess();
    } catch (err: any) {
      console.error("Error placing order:", err);
      const errorMessage =
        err.message || "Failed to place order. Please try again.";
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
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Order Date */}
            <FormField
              control={form.control}
              name="orderDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </FormControl>
                  <FormMessage />
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
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
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
      </CardContent>
    </Card>
  );
}
