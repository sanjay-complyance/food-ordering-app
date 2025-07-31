"use client";

import { useState, useEffect, useCallback } from "react";
import { pwaManager, NotificationPermissionState } from "@/lib/pwa";

export interface PWAState {
  isInstalled: boolean;
  canInstall: boolean;
  isInstalling: boolean;
  notificationPermission: NotificationPermissionState;
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstalled: false,
    canInstall: false,
    isInstalling: false,
    notificationPermission: { permission: "default", supported: false },
  });

  useEffect(() => {
    // Initialize PWA state
    const updateState = () => {
      setState((prev) => ({
        ...prev,
        isInstalled: pwaManager.isInstalled(),
        canInstall: pwaManager.canShowInstallPrompt(),
        notificationPermission: pwaManager.getNotificationPermission(),
      }));
    };

    updateState();

    // Listen for PWA events
    const handleBeforeInstallPrompt = () => {
      setState((prev) => ({ ...prev, canInstall: true }));
    };

    const handleAppInstalled = () => {
      setState((prev) => ({
        ...prev,
        isInstalled: true,
        canInstall: false,
        isInstalling: false,
      }));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Register service worker
    pwaManager.registerServiceWorker();

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!state.canInstall) return false;

    setState((prev) => ({ ...prev, isInstalling: true }));

    try {
      const success = await pwaManager.showInstallPrompt();
      if (!success) {
        setState((prev) => ({ ...prev, isInstalling: false }));
      }
      return success;
    } catch {
      setState((prev) => ({ ...prev, isInstalling: false }));
      return false;
    }
  }, [state.canInstall]);

  const requestNotificationPermission = useCallback(async () => {
    const permission = await pwaManager.requestNotificationPermission();
    setState((prev) => ({ ...prev, notificationPermission: permission }));
    return permission;
  }, []);

  const showNotification = useCallback(
    async (title: string, options?: NotificationOptions) => {
      return await pwaManager.showNotification(title, options);
    },
    []
  );

  return {
    ...state,
    installApp,
    requestNotificationPermission,
    showNotification,
  };
}

// Define a minimal Order type for queueing
export interface QueuedOrder {
  id: string;
  items: unknown[]; // Use unknown[] instead of any[]
  notes?: string;
}

export function useOrderQueue() {
  const [queue, setQueue] = useState<QueuedOrder[]>([]);

  // Load queue from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("orderQueue");
    if (stored) setQueue(JSON.parse(stored));
  }, []);

  // Save queue to localStorage
  useEffect(() => {
    localStorage.setItem("orderQueue", JSON.stringify(queue));
  }, [queue]);

  // Add order to queue
  const addToQueue = useCallback((order: QueuedOrder) => {
    setQueue((q) => [...q, order]);
  }, []);

  // Remove order from queue
  const removeFromQueue = useCallback((id: string) => {
    setQueue((q) => q.filter((o) => o.id !== id));
  }, []);

  // Sync orders when online
  const syncQueue = useCallback(async () => {
    for (const order of queue) {
      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(order),
        });
        if (res.ok) {
          removeFromQueue(order.id);
        }
      } catch {}
    }
  }, [queue, removeFromQueue]);

  // Listen for online event
  useEffect(() => {
    const handler = () => {
      if (queue.length > 0) syncQueue();
    };
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }, [queue, syncQueue]);

  return { queue, addToQueue, removeFromQueue, syncQueue };
}
