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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MenuDisplaySkeleton } from "@/components/ui/loading";
import { useToast } from "@/lib/toast";
import { IMenuItem } from "@/types/models";
import { AlertCircle, RefreshCw } from "lucide-react";

interface MenuDisplayProps {
  onSelectItem?: (item: IMenuItem) => void;
  selectedItems?: IMenuItem[];
}

export function MenuDisplay({ onSelectItem, selectedItems = [] }: MenuDisplayProps) {
  const [menu, setMenu] = useState<{
    _id: string;
    items: IMenuItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMenu = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching current menu");
      
      const response = await fetch(`/api/menu/current`, {
        cache: "no-store",
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      console.log("Menu API response status:", response.status);
      console.log("Menu API response ok:", response.ok);

      if (!response.ok) {
        if (response.status === 404) {
          console.log("No menu found");
          setMenu(null);
        } else {
          const errorText = await response.text();
          console.error("Menu API error response:", errorText);
          throw new Error(`Error fetching menu: ${response.status} ${response.statusText}`);
        }
      } else {
        const data = await response.json();
        console.log("Menu API success data:", data);
        setMenu(data.menu);
      }
    } catch (err) {
      console.error("Failed to fetch menu:", err);
      const errorMessage =
        "Failed to load menu. Please try again later.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error Loading Menu",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch immediately and then set up a refresh interval
    fetchMenu();
    
    // Set up a refresh interval to keep the menu updated
    const intervalId = setInterval(fetchMenu, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [toast]);

  if (loading) {
    return <MenuDisplaySkeleton />;
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Menu</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMenu}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={fetchMenu} 
            className="mt-4"
            variant="outline"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  console.log("MenuDisplay render - menu:", menu);
  console.log("MenuDisplay render - menu items length:", menu?.items?.length);
  
  if (!menu || menu.items.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Menu</CardTitle>
              <CardDescription>
                Available menu items for ordering
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMenu}
              disabled={loading}
              className="ml-4"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No menu items are currently available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Current Menu</CardTitle>
            <CardDescription>
              Available menu items for ordering
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMenu}
            disabled={loading}
            className="ml-4"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {menu.items.map((item, index) => {
            const isSelected = selectedItems.some(selected => selected.name === item.name);
            return (
              <Card 
                key={index} 
                className={`${!item.available ? "opacity-50" : ""} ${
                  isSelected ? "ring-2 ring-blue-500 bg-blue-50" : ""
                }`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{item.name}</span>
                    <div className="flex items-center space-x-2">
                      {isSelected && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                          Selected
                        </span>
                      )}
                      {!item.available && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">
                          Unavailable
                        </span>
                      )}
                    </div>
                  </CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {item.price && (
                    <p className="font-medium">${item.price.toFixed(2)}</p>
                  )}
                  {item.available && onSelectItem && (
                    <Button 
                      onClick={() => onSelectItem(item)} 
                      className={`mt-2 ${
                        isSelected 
                          ? "bg-red-600 hover:bg-red-700" 
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {isSelected ? "Remove" : "Select"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
