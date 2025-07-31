"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Header } from "@/components/layout/Header";
import { MenuDisplay } from "@/components/menu/MenuDisplay";
import { OrderForm } from "@/components/menu/OrderForm";
import { OrderHistory } from "@/components/menu/OrderHistory";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { IMenuItem } from "@/types/models";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [selectedItems, setSelectedItems] = useState<IMenuItem[]>([]);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSelectItem = (item: IMenuItem) => {
    setSelectedItems(prev => {
      const existingIndex = prev.findIndex(i => i.name === item.name);
      if (existingIndex >= 0) {
        // Item already selected, remove it
        return prev.filter(i => i.name !== item.name);
      } else {
        // Add new item
        return [...prev, item];
      }
    });
  };

  const handleCancelOrder = () => {
    setShowOrderForm(false);
    setSelectedItems([]);
  };

  const handleOrderSuccess = () => {
    setShowOrderForm(false);
    setSelectedItems([]);
    setOrderSuccess(true);
    setRefreshTrigger(prev => prev + 1); // Trigger refresh of order history
  };

  const handleProceedToOrder = () => {
    if (selectedItems.length > 0) {
      setShowOrderForm(true);
      setOrderSuccess(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main>
          <div className="container mx-auto px-4 py-8">
            {/* Main content */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Menu and Order Form Column */}
              <div className="md:col-span-2 space-y-6">
                {orderSuccess && (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4 animate-pulse">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium">
                          Your order has been placed successfully!
                        </p>
                        <p className="text-xs mt-1">
                          Check the &quot;Today&apos;s Order&quot; section to see your order details.
                        </p>
                        <p className="text-xs mt-1 text-green-600">
                          The page will automatically refresh to show your order.
                        </p>
                      </div>
                    </div>
                    <Button
                      className="absolute top-0 right-0 mt-2 mr-2"
                      variant="ghost"
                      size="sm"
                      onClick={() => setOrderSuccess(false)}
                    >
                      ✕
                    </Button>
                  </div>
                )}

                {showOrderForm ? (
                  <OrderForm
                    selectedItems={selectedItems}
                    onCancel={handleCancelOrder}
                    onSuccess={handleOrderSuccess}
                  />
                ) : (
                  <div className="space-y-4">
                    <MenuDisplay 
                      onSelectItem={handleSelectItem}
                      selectedItems={selectedItems}
                    />
                    
                    {selectedItems.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-blue-900">
                              Selected Items ({selectedItems.length})
                            </h3>
                            <p className="text-sm text-blue-700 mt-1">
                              {selectedItems.map(item => item.name).join(", ")}
                            </p>
                          </div>
                          <Button 
                            onClick={handleProceedToOrder}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Proceed to Order
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Order History Column */}
              <div className="md:col-span-1">
                <OrderHistory limit={5} refreshTrigger={refreshTrigger} />
              </div>
            </div>
          </div>
        </main>

        {/* PWA Install Prompt */}
        <InstallPrompt />
      </div>
    </ProtectedRoute>
  );
}
