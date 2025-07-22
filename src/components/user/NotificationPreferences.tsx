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
}

export default function NotificationPreferences({
  onClose,
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
        setPreferences(data.preferences);
      } else {
        toast({
          title: "Error",
          description: "Failed to load notification preferences",
          variant: "destructive",
        });
      }
    } catch (error) {
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
    } catch (error) {
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
    value: any
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Loading preferences...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Customize how and when you receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Types */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Notification Types</h3>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="order-reminders">Order Reminders</Label>
              <p className="text-sm text-muted-foreground">
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

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="order-confirmations">Order Confirmations</Label>
              <p className="text-sm text-muted-foreground">
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

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="order-modifications">Order Modifications</Label>
              <p className="text-sm text-muted-foreground">
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

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="menu-updates">Menu Updates</Label>
              <p className="text-sm text-muted-foreground">
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

        {/* Delivery Method */}
        <div className="space-y-2">
          <Label htmlFor="delivery-method">Delivery Method</Label>
          <Select
            value={preferences.deliveryMethod}
            onValueChange={(value: NotificationDeliveryMethod) =>
              updatePreference("deliveryMethod", value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select delivery method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in_app">In-App Only</SelectItem>
              <SelectItem value="email">Email Only</SelectItem>
              <SelectItem value="both">Both In-App and Email</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Choose how you want to receive notifications
          </p>
        </div>

        {/* Frequency */}
        <div className="space-y-2">
          <Label htmlFor="frequency">Notification Frequency</Label>
          <Select
            value={preferences.frequency}
            onValueChange={(value: NotificationFrequency) =>
              updatePreference("frequency", value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Notifications</SelectItem>
              <SelectItem value="important_only">Important Only</SelectItem>
              <SelectItem value="none">No Notifications</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Control the overall frequency of notifications
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button onClick={savePreferences} disabled={saving}>
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
