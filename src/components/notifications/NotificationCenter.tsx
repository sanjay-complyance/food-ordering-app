"use client";

import { formatDistanceToNow } from "date-fns";
import { Bell, Check, CheckCheck, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { INotification, NotificationType } from "@/types/models";

interface NotificationCenterProps {
  notifications: INotification[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

// Helper function to get notification type styling
const getNotificationTypeStyle = (type: NotificationType) => {
  switch (type) {
    case "order_reminder":
      return {
        badge: "bg-blue-100 text-blue-800 hover:bg-blue-200",
        icon: "🍽️",
        iconBg: "bg-blue-50 border-blue-200",
        label: "Reminder",
      };
    case "order_confirmed":
      return {
        badge: "bg-green-100 text-green-800 hover:bg-green-200",
        icon: "✅",
        iconBg: "bg-green-50 border-green-200",
        label: "Confirmed",
      };
    case "order_modified":
      return {
        badge: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
        icon: "✏️",
        iconBg: "bg-yellow-50 border-yellow-200",
        label: "Modified",
      };
    case "menu_updated":
      return {
        badge: "bg-purple-100 text-purple-800 hover:bg-purple-200",
        icon: "📋",
        iconBg: "bg-purple-50 border-purple-200",
        label: "Menu Update",
      };
    default:
      return {
        badge: "bg-gray-100 text-gray-800 hover:bg-gray-200",
        icon: "📢",
        iconBg: "bg-gray-50 border-gray-200",
        label: "Info",
      };
  }
};

// Helper function to format notification time
const formatNotificationTime = (date: Date) => {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return "Unknown time";
  }
};

export function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onRefresh,
  isLoading,
}: NotificationCenterProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  if (isLoading) {
    return (
      <Card className="border border-gray-200 shadow-xl max-w-xs bg-white rounded-lg">
        <CardHeader className="pb-1.5 px-2 pt-2 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 px-2 pb-2 bg-white">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200 shadow-xl max-w-xs bg-white rounded-lg">
              <CardHeader className="pb-1.5 px-2 pt-2 bg-white border-b border-gray-200">
                <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-blue-50 rounded">
              <Bell className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <CardTitle className="text-sm font-semibold text-gray-900">Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 px-1 py-0.5 rounded-full">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <RefreshCw className="h-3 w-3 text-gray-600" />
            </Button>
            {unreadCount > 0 && (
                              <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMarkAllAsRead}
                  className="h-5 px-1 text-xs font-medium hover:bg-gray-100"
                >
                  <CheckCheck className="h-2.5 w-2.5 mr-0.5" />
                  Mark all read
                </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="max-h-56 overflow-y-auto px-2 pb-2 bg-white">
        {notifications.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <div className="p-1.5 bg-gray-50 rounded-full w-8 h-8 mx-auto mb-1.5 flex items-center justify-center">
              <Bell className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-xs font-medium text-gray-700 mb-1">No notifications yet</p>
                          <p className="text-xs text-gray-500">
                You'll see order reminders and updates here
              </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => {
              const typeStyle = getNotificationTypeStyle(notification.type);

              return (
                <div
                  key={notification._id.toString()}
                  className={`p-1.5 rounded border transition-all duration-200 hover:shadow-md ${
                    notification.read
                      ? "bg-gray-50/80 border-gray-200"
                      : "bg-white border-gray-200 shadow-sm hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start gap-1.5">
                    <div
                      className={`flex-shrink-0 w-6 h-6 flex items-center justify-center text-sm rounded-full border ${typeStyle.iconBg} ${
                        notification.read ? "opacity-70" : "opacity-100"
                      }`}
                    >
                      {typeStyle.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 mb-0.5">
                                          <Badge
                    variant="secondary"
                    className={`text-xs font-medium px-1 py-0.5 ${typeStyle.badge}`}
                  >
                    {typeStyle.label}
                  </Badge>
                        <div className="flex items-center gap-1">
                                           <span className="text-xs text-gray-400">
                   {formatNotificationTime(notification.createdAt)}
                 </span>
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                onMarkAsRead(notification._id.toString())
                              }
                              className="h-5 w-5 p-0 opacity-70 hover:opacity-100 hover:bg-gray-100"
                            >
                              <Check className="h-2.5 w-2.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p
                        className={`text-xs leading-relaxed break-words ${
                          notification.read
                            ? "text-gray-600"
                            : "text-gray-900 font-medium"
                        }`}
                      >
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
