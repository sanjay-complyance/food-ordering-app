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
    } catch (error) {
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
