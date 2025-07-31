"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationCenter } from "./NotificationCenter";
import { INotification } from "@/types/models";
import { useRef } from "react";

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications?limit=20");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        const unread =
          data.notifications?.filter((n: INotification) => !n.read).length || 0;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ read: true }),
      });

      if (response.ok) {
        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n._id.toString() === notificationId
              ? ({ ...n, read: true } as INotification)
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.read);

      // Mark each unread notification as read
      await Promise.all(
        unreadNotifications.map((notification) =>
          fetch(`/api/notifications/${notification._id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ read: true }),
          })
        )
      );

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true } as INotification))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // SSE: Listen for real-time notification updates
  useEffect(() => {
    fetchNotifications();
    // Set up SSE connection
    const eventSource = new EventSource("/api/notifications/stream");
    eventSourceRef.current = eventSource;
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data.notifications)) {
          setNotifications((prev) => {
            // Merge and deduplicate by _id
            const notifMap = new Map();
            // Add existing notifications
            prev.forEach((n: INotification) => notifMap.set(n._id.toString(), n));
            // Add/replace with new notifications
            (data.notifications as INotification[]).forEach((n: INotification) => notifMap.set(n._id.toString(), n));
            // Convert to array and sort by createdAt desc
            return Array.from(notifMap.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          });
        }
      } catch {
        // Ignore parse errors
      }
    };
    eventSource.onerror = () => {
      eventSource.close();
    };
    // Set up polling every 30 seconds as fallback
    const interval = setInterval(fetchNotifications, 30000);
    return () => {
      clearInterval(interval);
      eventSource.close();
    };
  }, []);

  // Update unread count when notifications change
  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.read).length);
  }, [notifications]);

  // Refresh notifications when popover opens
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      fetchNotifications();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative ${className}`}
          disabled={isLoading}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 z-[9999] bg-white border border-gray-200 shadow-xl" align="end" sideOffset={8}>
        <NotificationCenter
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onRefresh={fetchNotifications}
          isLoading={isLoading}
        />
      </PopoverContent>
    </Popover>
  );
}
