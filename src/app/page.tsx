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
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
                    <span className="block sm:inline">
                      Your order has been placed successfully!
                    </span>
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
                <OrderHistory limit={5} />
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
