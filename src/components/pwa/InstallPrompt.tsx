"use client";

import { useState, useEffect } from "react";
import { usePWA } from "@/hooks/usePWA";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone } from "lucide-react";

interface InstallPromptProps {
  onDismiss?: () => void;
  autoShow?: boolean;
  className?: string;
}

export function InstallPrompt({
  onDismiss,
  autoShow = true,
  className,
}: InstallPromptProps) {
  const { canInstall, isInstalling, installApp } = usePWA();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (autoShow && canInstall && !isDismissed) {
      // Show prompt after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [canInstall, isDismissed, autoShow]);

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    onDismiss?.();
  };

  // Don't show in development mode to avoid conflicts
  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  if (!canInstall || !isVisible) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 ${className}`}>
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 mx-auto max-w-sm">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Install App</h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Install Daily Lunch Ordering for quick access and offline
          functionality.
        </p>

        <div className="flex space-x-2">
          <Button
            onClick={handleInstall}
            disabled={isInstalling}
            className="flex-1 flex items-center justify-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>{isInstalling ? "Installing..." : "Install"}</span>
          </Button>
          <Button variant="outline" onClick={handleDismiss} className="px-3">
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}

export function InstallButton({ className }: { className?: string }) {
  const { canInstall, isInstalling, installApp } = usePWA();

  // Show a development message instead of the install button
  if (process.env.NODE_ENV === 'development') {
    return (
      <Button
        variant="outline"
        className={`flex items-center space-x-2 ${className}`}
        disabled
        title="PWA install only available in production"
      >
        <Download className="h-4 w-4" />
        <span>Install (Dev)</span>
      </Button>
    );
  }

  if (!canInstall) {
    return null;
  }

  return (
    <Button
      onClick={installApp}
      disabled={isInstalling}
      variant="outline"
      className={`flex items-center space-x-2 ${className}`}
    >
      <Download className="h-4 w-4" />
      <span>{isInstalling ? "Installing..." : "Install App"}</span>
    </Button>
  );
}
