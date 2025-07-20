"use client";

import { useState } from "react";
import { usePWA } from "@/hooks/usePWA";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Check, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NotificationPermissionProps {
  onPermissionChange?: (permission: NotificationPermission) => void;
  showStatus?: boolean;
  className?: string;
}

export function NotificationPermission({
  onPermissionChange,
  showStatus = true,
  className,
}: NotificationPermissionProps) {
  const { notificationPermission, requestNotificationPermission } = usePWA();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const result = await requestNotificationPermission();
      onPermissionChange?.(result.permission);
    } finally {
      setIsRequesting(false);
    }
  };

  const getStatusIcon = () => {
    switch (notificationPermission.permission) {
      case "granted":
        return <Check className="h-4 w-4 text-green-600" />;
      case "denied":
        return <X className="h-4 w-4 text-red-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusText = () => {
    switch (notificationPermission.permission) {
      case "granted":
        return "Notifications enabled";
      case "denied":
        return "Notifications blocked";
      default:
        return "Notifications not configured";
    }
  };

  const getStatusColor = () => {
    switch (notificationPermission.permission) {
      case "granted":
        return "border-green-200 bg-green-50";
      case "denied":
        return "border-red-200 bg-red-50";
      default:
        return "border-yellow-200 bg-yellow-50";
    }
  };

  if (!notificationPermission.supported) {
    return (
      <Alert className={`${className} border-gray-200 bg-gray-50`}>
        <BellOff className="h-4 w-4" />
        <AlertDescription>
          Notifications are not supported in this browser.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={className}>
      {showStatus && (
        <Alert className={getStatusColor()}>
          {getStatusIcon()}
          <AlertDescription className="flex items-center justify-between">
            <span>{getStatusText()}</span>
            {notificationPermission.permission === "default" && (
              <Button
                onClick={handleRequestPermission}
                disabled={isRequesting}
                size="sm"
                variant="outline"
                className="ml-2"
              >
                {isRequesting ? "Requesting..." : "Enable"}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {notificationPermission.permission === "denied" && (
        <div className="mt-2 text-sm text-gray-600">
          <p>To enable notifications:</p>
          <ol className="list-decimal list-inside mt-1 space-y-1">
            <li>Click the lock icon in your browser's address bar</li>
            <li>Change notifications from "Block" to "Allow"</li>
            <li>Refresh the page</li>
          </ol>
        </div>
      )}
    </div>
  );
}

export function NotificationToggle({ className }: { className?: string }) {
  const { notificationPermission, requestNotificationPermission } = usePWA();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleToggle = async () => {
    if (notificationPermission.permission === "granted") {
      // Can't programmatically revoke permission, show instructions
      alert("To disable notifications, please use your browser settings.");
      return;
    }

    setIsRequesting(true);
    try {
      await requestNotificationPermission();
    } finally {
      setIsRequesting(false);
    }
  };

  if (!notificationPermission.supported) {
    return null;
  }

  const isEnabled = notificationPermission.permission === "granted";

  return (
    <Button
      onClick={handleToggle}
      disabled={isRequesting || notificationPermission.permission === "denied"}
      variant={isEnabled ? "default" : "outline"}
      className={`flex items-center space-x-2 ${className}`}
    >
      {isEnabled ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      <span>
        {isRequesting
          ? "Requesting..."
          : isEnabled
          ? "Notifications On"
          : "Enable Notifications"}
      </span>
    </Button>
  );
}
