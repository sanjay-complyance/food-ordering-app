"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, TestTube } from "lucide-react";
import { useToast } from "@/lib/toast";

export function PushNotificationTest() {
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      const response = await fetch('/api/pwa/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Test Notification Sent!",
          description: "Check your browser for the push notification.",
          variant: "success",
        });
      } else {
        toast({
          title: "Test Failed",
          description: result.error || "Failed to send test notification",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Test notification error:', error);
      toast({
        title: "Test Failed",
        description: "An error occurred while sending the test notification",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <TestTube className="h-4 w-4" />
        <AlertDescription>
          Test push notifications to verify they are working correctly.
        </AlertDescription>
      </Alert>

      <Button
        onClick={handleTestNotification}
        disabled={isTesting}
        className="flex items-center space-x-2"
      >
        <Bell className="h-4 w-4" />
        <span>
          {isTesting ? "Sending Test..." : "Send Test Notification"}
        </span>
      </Button>

      <div className="text-sm text-gray-600">
        <p className="font-medium mb-2">To test push notifications:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Make sure you have enabled push notifications</li>
          <li>Click the &quot;Send Test Notification&quot; button above</li>
          <li>Check your browser for the notification</li>
          <li>If you don&apos;t see it, check your browser&apos;s notification settings</li>
        </ol>
      </div>
    </div>
  );
} 