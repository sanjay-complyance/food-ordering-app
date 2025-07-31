"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/lib/toast";
import {
  INotificationPreferences,
  NotificationDeliveryMethod,
  NotificationFrequency,
} from "@/types/models";

interface NotificationPreferencesProps {
  onClose?: () => void;
  isModal?: boolean;
}

export default function NotificationPreferences({
  onClose,
  isModal = false,
}: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<INotificationPreferences>({
    orderReminders: true,
    orderConfirmations: true,
    orderModifications: true,
    menuUpdates: true,
    deliveryMethod: "in_app",
    frequency: "all",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch("/api/user/preferences");
      if (response.ok) {
        const data = await response.json();
        console.log("Loaded preferences:", data.preferences);
        setPreferences(data.preferences);
      } else {
        console.log("Failed to load preferences, using defaults");
        toast({
          title: "Error",
          description: "Failed to load notification preferences",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.log("Error loading preferences:", error);
      toast({
        title: "Error",
        description: "Failed to load notification preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Notification preferences updated successfully",
        });
        onClose?.();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to update preferences",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (
    key: keyof INotificationPreferences,
    value: boolean | NotificationDeliveryMethod | NotificationFrequency
  ) => {
    console.log(`Updating preference ${key} to:`, value);
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center bg-gray-50 justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading preferences...</p>
        </div>
      </div>
    );
  }

  const content = (
    <div className="space-y-6 bg-white">
      {/* Notification Types Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Notification Types</h3>
          <p className="text-sm text-gray-600 mb-4">
            Choose which types of notifications you want to receive
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="order-reminders" className="text-sm font-medium">
                Order Reminders
              </Label>
              <p className="text-xs text-gray-500">
                Daily reminders to place your lunch order
              </p>
            </div>
            <Switch
              id="order-reminders"
              checked={preferences.orderReminders}
              onCheckedChange={(checked) =>
                updatePreference("orderReminders", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="order-confirmations" className="text-sm font-medium">
                Order Confirmations
              </Label>
              <p className="text-xs text-gray-500">
                Notifications when your order is confirmed
              </p>
            </div>
            <Switch
              id="order-confirmations"
              checked={preferences.orderConfirmations}
              onCheckedChange={(checked) =>
                updatePreference("orderConfirmations", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="order-modifications" className="text-sm font-medium">
                Order Modifications
              </Label>
              <p className="text-xs text-gray-500">
                Notifications when your order is modified
              </p>
            </div>
            <Switch
              id="order-modifications"
              checked={preferences.orderModifications}
              onCheckedChange={(checked) =>
                updatePreference("orderModifications", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="menu-updates" className="text-sm font-medium">
                Menu Updates
              </Label>
              <p className="text-xs text-gray-500">
                Notifications when new menus are available
              </p>
            </div>
            <Switch
              id="menu-updates"
              checked={preferences.menuUpdates}
              onCheckedChange={(checked) =>
                updatePreference("menuUpdates", checked)
              }
            />
          </div>
        </div>
      </div>

      {/* Delivery Method Section */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="delivery-method" className="text-sm font-medium">
            Delivery Method
          </Label>
          <p className="text-xs text-gray-500 mt-1">
            Choose how you want to receive notifications
          </p>
        </div>
        <Select
          value={preferences.deliveryMethod}
          onValueChange={(value: NotificationDeliveryMethod) =>
            updatePreference("deliveryMethod", value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select delivery method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in_app">In-App Only</SelectItem>
            <SelectItem value="email">Email Only</SelectItem>
            <SelectItem value="both">Both In-App and Email</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notification Frequency Section */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="frequency" className="text-sm font-medium">
            Notification Frequency
          </Label>
          <p className="text-xs text-gray-500 mt-1">
            Control the overall frequency of notifications
          </p>
        </div>
        <Select
          value={preferences.frequency}
          onValueChange={(value: NotificationFrequency) =>
            updatePreference("frequency", value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Notifications</SelectItem>
            <SelectItem value="important_only">Important Only</SelectItem>
            <SelectItem value="none">No Notifications</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button onClick={savePreferences} disabled={saving}>
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );

  // If it's a modal, return just the content
  if (isModal) {
    return content;
  }

  // Otherwise, wrap in a card for standalone use
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Customize how and when you receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
