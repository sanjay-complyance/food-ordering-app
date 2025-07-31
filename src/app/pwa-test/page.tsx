"use client";

import { useEffect, useState } from "react";
import { usePWA } from "@/hooks/usePWA";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Download, CheckCircle, XCircle } from "lucide-react";
import { PushNotificationTest } from "@/components/pwa/PushNotificationTest";

export default function PWATestPage() {
  const { canInstall, isInstalling, installApp, isInstalled } = usePWA();
  const [pwaInfo, setPwaInfo] = useState<{
    hasServiceWorker: boolean;
    hasManifest: boolean;
    isHTTPS: boolean;
    isStandalone: boolean;
    userAgent: string;
    platform: string;
    isDevelopment: boolean;
  }>({
    hasServiceWorker: false,
    hasManifest: false,
    isHTTPS: false,
    isStandalone: false,
    userAgent: '',
    platform: '',
    isDevelopment: false,
  });

  useEffect(() => {
    // Check PWA criteria
    const checkPWACriteria = () => {
      const info = {
        hasServiceWorker: 'serviceWorker' in navigator,
        hasManifest: !!document.querySelector('link[rel="manifest"]'),
        isHTTPS: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        isDevelopment: process.env.NODE_ENV === 'development',
      };
      setPwaInfo(info);
    };

    checkPWACriteria();
  }, []);

  const handleInstall = async () => {
    console.log("Manual install triggered");
    const success = await installApp();
    console.log("Install result:", success);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">PWA Install Test</h1>
      
      {pwaInfo.isDevelopment && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Development Mode:</strong> PWA install functionality is disabled in development to prevent conflicts. 
            To test PWA install, build and run the production version using <code>npm run build && npm start</code>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>PWA Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <strong>Can Install:</strong> 
                {canInstall ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                <span>{canInstall ? "Yes" : "No"}</span>
              </div>
              <div className="flex items-center gap-2">
                <strong>Is Installing:</strong> 
                {isInstalling ? <CheckCircle className="h-4 w-4 text-yellow-500" /> : <XCircle className="h-4 w-4 text-gray-400" />}
                <span>{isInstalling ? "Yes" : "No"}</span>
              </div>
              <div className="flex items-center gap-2">
                <strong>Is Installed:</strong> 
                {isInstalled ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-400" />}
                <span>{isInstalled ? "Yes" : "No"}</span>
              </div>
              <div className="flex items-center gap-2">
                <strong>Environment:</strong> 
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  {pwaInfo.isDevelopment ? "Development" : "Production"}
                </span>
              </div>
            </div>
            
            <Button 
              onClick={handleInstall} 
              disabled={!canInstall || isInstalling || pwaInfo.isDevelopment}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isInstalling ? "Installing..." : pwaInfo.isDevelopment ? "Install (Dev Disabled)" : "Install App"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>PWA Criteria Check</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <strong>Service Worker Support:</strong> 
                {pwaInfo.hasServiceWorker ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
              </div>
              <div className="flex items-center justify-between">
                <strong>Manifest File:</strong> 
                {pwaInfo.hasManifest ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
              </div>
              <div className="flex items-center justify-between">
                <strong>HTTPS/Localhost:</strong> 
                {pwaInfo.isHTTPS ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
              </div>
              <div className="flex items-center justify-between">
                <strong>Standalone Mode:</strong> 
                {pwaInfo.isStandalone ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-400" />}
              </div>
              <div className="flex items-center justify-between">
                <strong>Platform:</strong> 
                <span className="text-xs">{pwaInfo.platform}</span>
              </div>
              <div className="flex items-center justify-between">
                <strong>User Agent:</strong> 
                <span className="text-xs break-all max-w-xs">{pwaInfo.userAgent}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <strong>For Development Testing:</strong>
                <ul className="list-disc list-inside mt-2 ml-4 space-y-1">
                  <li>Use the PWA test page to verify criteria</li>
                  <li>Check browser console for debugging info</li>
                  <li>PWA install is disabled in development</li>
                </ul>
              </div>
              <div>
                <strong>For Production Testing:</strong>
                <ul className="list-disc list-inside mt-2 ml-4 space-y-1">
                  <li>Run <code>npm run build</code></li>
                  <li>Run <code>npm start</code></li>
                  <li>Visit the app in a supported browser</li>
                  <li>Interact with the app to trigger install prompt</li>
                </ul>
              </div>
              <div>
                <strong>Supported Browsers:</strong>
                <ul className="list-disc list-inside mt-2 ml-4 space-y-1">
                  <li>Chrome/Edge: Full PWA support</li>
                  <li>Firefox: Limited support</li>
                  <li>Safari: iOS only</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Push Notification Test</CardTitle>
          </CardHeader>
          <CardContent>
            <PushNotificationTest />
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 