// PWA utilities for service worker and notifications

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface NotificationPermissionState {
  permission: NotificationPermission;
  supported: boolean;
}

export class PWAManager {
  private static instance: PWAManager;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private installPromptShown = false;

  private constructor() {
    if (typeof window !== "undefined") {
      this.setupInstallPrompt();
    }
  }

  static getInstance(): PWAManager {
    if (!PWAManager.instance) {
      PWAManager.instance = new PWAManager();
    }
    return PWAManager.instance;
  }

  private setupInstallPrompt() {
    window.addEventListener("beforeinstallprompt", (e) => {
      console.log("beforeinstallprompt event fired");
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
    });

    window.addEventListener("appinstalled", () => {
      console.log("App installed successfully");
      this.deferredPrompt = null;
      this.installPromptShown = false;
    });

    // Debug: Check if app is already installed
    if (this.isInstalled()) {
      console.log("App is already installed");
    }
  }

  async showInstallPrompt(): Promise<boolean> {
    console.log("showInstallPrompt called", {
      hasDeferredPrompt: !!this.deferredPrompt,
      installPromptShown: this.installPromptShown
    });

    if (!this.deferredPrompt || this.installPromptShown) {
      console.log("Cannot show install prompt - conditions not met");
      return false;
    }

    this.installPromptShown = true;

    try {
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;

      console.log("Install prompt outcome:", outcome);

      if (outcome === "accepted") {
        this.deferredPrompt = null;
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error showing install prompt:", error);
      return false;
    }
  }

  canShowInstallPrompt(): boolean {
    const canShow = !!this.deferredPrompt && !this.installPromptShown;
    console.log("canShowInstallPrompt:", canShow, {
      hasDeferredPrompt: !!this.deferredPrompt,
      installPromptShown: this.installPromptShown
    });
    return canShow;
  }

  isInstalled(): boolean {
    if (typeof window === "undefined") return false;

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    const isAndroidApp = document.referrer.includes("android-app://");

    const installed = isStandalone || isIOSStandalone || isAndroidApp;
    console.log("isInstalled check:", {
      isStandalone,
      isIOSStandalone,
      isAndroidApp,
      installed
    });

    return installed;
  }

  async requestNotificationPermission(): Promise<NotificationPermissionState> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return { permission: "denied", supported: false };
    }

    if (Notification.permission === "granted") {
      return { permission: "granted", supported: true };
    }

    if (Notification.permission === "denied") {
      return { permission: "denied", supported: true };
    }

    try {
      const permission = await Notification.requestPermission();
      return { permission, supported: true };
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return { permission: "denied", supported: true };
    }
  }

  async showNotification(
    title: string,
    options?: NotificationOptions
  ): Promise<boolean> {
    const { permission, supported } =
      await this.requestNotificationPermission();

    if (!supported || permission !== "granted") {
      return false;
    }

    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        // Use service worker for better notification handling
        navigator.serviceWorker.controller.postMessage({
          type: "SHOW_NOTIFICATION",
          payload: { title, options },
        });
      } else {
        // Fallback to direct notification
        new Notification(title, options);
      }
      return true;
    } catch (error) {
      console.error("Error showing notification:", error);
      return false;
    }
  }

  async registerServiceWorker(): Promise<boolean> {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker registered:", registration);
      return true;
    } catch (error) {
      console.error("Service Worker registration failed:", error);
      return false;
    }
  }

  getNotificationPermission(): NotificationPermissionState {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return { permission: "denied", supported: false };
    }

    return {
      permission: Notification.permission,
      supported: true,
    };
  }
}

export const pwaManager = PWAManager.getInstance();

const VAPID_PUBLIC_KEY = 'BMyKCU9-fHcPKNeKxpxWbmMaw3cdUuTd8DjP3PaSiOEZRA8yOcaCKHdmyEU3DhXlOE4pKdJq4DhKj29jj8B6iaE';

export async function subscribeUserToPush() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported in this browser.');
  }
  // Register service worker if not already
  const registration = await navigator.serviceWorker.ready;
  // Request notification permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission not granted.');
  }
  // Subscribe to push
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  return subscription;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
