"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useToast } from "@/lib/toast";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "../ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit } from "lucide-react";

interface MenuItem {
  _id?: string;
  name: string;
  description: string;
  available: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function MenuManager() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemAvailable, setItemAvailable] = useState(true);

  // Fetch menu items on component mount
  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/menu-items`);
      const data = await response.json();

      if (response.ok) {
        setMenuItems(data.items || []);
      } else {
        console.error("Failed to fetch menu items:", data.error);
      }
    } catch (error) {
      console.error("Error fetching menu items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveItem = async () => {
    try {
      setIsLoading(true);

      if (!itemName.trim()) {
        toast({
          variant: "warning",
          title: "Validation Error",
          description: "Please enter an item name",
        });
        setIsLoading(false);
        return;
      }

      if (!itemDescription.trim()) {
        toast({
          variant: "warning",
          title: "Validation Error",
          description: "Please enter an item description",
        });
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/menu-items", {
        method: editingItem ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          _id: editingItem?._id,
          name: itemName,
          description: itemDescription,
          available: itemAvailable,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsDialogOpen(false);
        fetchMenuItems();
        resetForm();
        toast({
          title: `Menu item ${editingItem ? "updated" : "created"} successfully`,
          description: `The menu item has been ${editingItem ? "updated" : "created"}.`,
        });
      } else {
        console.error("Failed to save menu item:", data.error);
        toast({
          variant: "destructive",
          title: `Failed to ${editingItem ? "update" : "create"} menu item`,
          description: data.error,
        });
      }
    } catch (error) {
      console.error("Error saving menu item:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this menu item?")) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/menu-items?id=${itemId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        fetchMenuItems();
        toast({
          title: "Menu item deleted successfully",
          description: "The menu item has been deleted.",
        });
      } else {
        console.error("Failed to delete menu item:", data.error);
        toast({
          variant: "destructive",
          title: "Failed to delete menu item",
          description: data.error,
        });
      }
    } catch (error) {
      console.error("Error deleting menu item:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemDescription(item.description);
    setItemAvailable(item.available);
    setIsDialogOpen(true);
  };

  const handleToggleAvailable = async (itemId: string, available: boolean) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/menu-items/${itemId}/toggle`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ available: !available }),
      });

      const data = await response.json();

      if (response.ok) {
        fetchMenuItems();
        toast({
          title: "Menu item status updated",
          description: `Menu item has been ${!available ? "activated" : "deactivated"}.`,
        });
      } else {
        console.error("Failed to toggle menu item status:", data.error);
        toast({
          variant: "destructive",
          title: "Failed to update menu item status",
          description: data.error,
        });
      }
    } catch (error) {
      console.error("Error toggling menu item status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setItemName("");
    setItemDescription("");
    setItemAvailable(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  if (!isAdmin) {
    return <div>Unauthorized</div>;
  }

  return (
    <Card className="p-6 bg-white shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Menu Items Manager</h2>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Menu Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-white border-0 shadow-2xl">
            <DialogHeader className="border-b border-gray-200 pb-4">
              <DialogTitle className="text-2xl font-bold text-gray-900">
                {editingItem ? "Edit Menu Item" : "Add Menu Item"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div>
                <Label htmlFor="item-name" className="text-sm font-medium text-gray-700">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="item-name"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Enter item name"
                  className="mt-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <Label htmlFor="item-description" className="text-sm font-medium text-gray-700">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="item-description"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="Enter item description"
                  className="mt-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="item-available"
                  checked={itemAvailable}
                  onChange={(e) => setItemAvailable(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <Label htmlFor="item-available" className="text-sm font-medium text-gray-700">
                  Available for ordering
                </Label>
              </div>
            </div>
            <DialogFooter className="border-t border-gray-200 pt-6 bg-gray-50 -mx-6 -mb-6 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="mr-3 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveItem} 
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
              >
                {isLoading ? "Saving..." : editingItem ? "Update Item" : "Save Item"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-gray-900">Name</TableHead>
                <TableHead className="font-semibold text-gray-900">Description</TableHead>
                <TableHead className="font-semibold text-gray-900">Status</TableHead>
                <TableHead className="font-semibold text-gray-900">Created</TableHead>
                <TableHead className="font-semibold text-gray-900">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menuItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                    No menu items found. Add your first menu item to get started.
                  </TableCell>
                </TableRow>
              ) : (
                menuItems.map((item) => (
                  <TableRow key={item._id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-900">{item.name}</TableCell>
                    <TableCell className="text-gray-600">{item.description}</TableCell>
                    <TableCell>
                      <Badge variant={item.available ? "default" : "secondary"} className={item.available ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                        {item.available ? "Available" : "Unavailable"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditItem(item)}
                          className="text-blue-600 border-blue-600 hover:bg-blue-50 shadow-sm"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleAvailable(item._id!, item.available)}
                          className={item.available ? "text-orange-600 border-orange-600 hover:bg-orange-50 shadow-sm" : "text-green-600 border-green-600 hover:bg-green-50 shadow-sm"}
                        >
                          {item.available ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteItem(item._id!)}
                          className="text-red-600 border-red-600 hover:bg-red-50 shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
