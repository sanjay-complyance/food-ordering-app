"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Upload
} from "lucide-react";
import { useToast } from "@/lib/toast";

interface SyncItem {
  id: string;
  type: 'order' | 'menu_update' | 'notification';
  data: Record<string, unknown>;
  timestamp: Date;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  retryCount: number;
}

export function BackgroundSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [syncQueue, setSyncQueue] = useState<SyncItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load sync queue from localStorage
    const savedQueue = localStorage.getItem('syncQueue');
    if (savedQueue) {
      try {
        const parsed = JSON.parse(savedQueue);
        setSyncQueue(parsed.map((item: Record<string, unknown>) => ({
          ...item,
          timestamp: new Date(item.timestamp as string)
        })));
      } catch (error) {
        console.error('Failed to load sync queue:', error);
      }
    }

    // Load last sync time
    const savedLastSync = localStorage.getItem('lastSync');
    if (savedLastSync) {
      setLastSync(new Date(savedLastSync));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save sync queue to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('syncQueue', JSON.stringify(syncQueue));
  }, [syncQueue]);



  const processSyncQueue = async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    const pendingItems = syncQueue.filter(item => item.status === 'pending' || item.status === 'failed');

    for (const item of pendingItems) {
      try {
        // Update status to syncing
        setSyncQueue(prev => prev.map(i => 
          i.id === item.id ? { ...i, status: 'syncing' } : i
        ));

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Process based on type
        switch (item.type) {
          case 'order':
            await syncOrder(item.data);
            break;
          case 'menu_update':
            await syncMenuUpdate(item.data);
            break;
          case 'notification':
            await syncNotification(item.data);
            break;
        }

        // Mark as completed
        setSyncQueue(prev => prev.map(i => 
          i.id === item.id ? { ...i, status: 'completed' } : i
        ));

        toast({
          title: 'Sync completed',
          description: `${item.type} synced successfully`,
          variant: 'success'
        });

      } catch (error) {
        console.error('Sync failed for item:', item.id, error);
        
        // Mark as failed and increment retry count
        setSyncQueue(prev => prev.map(i => 
          i.id === item.id ? { 
            ...i, 
            status: 'failed', 
            retryCount: i.retryCount + 1 
          } : i
        ));

        toast({
          title: 'Sync failed',
          description: `Failed to sync ${item.type}. Will retry later.`,
          variant: 'destructive'
        });
      }
    }

    setIsSyncing(false);
    setLastSync(new Date());
    localStorage.setItem('lastSync', new Date().toISOString());

    // Clean up completed items after 24 hours
    setTimeout(() => {
      setSyncQueue(prev => prev.filter(item => {
        const hoursSinceCompletion = (Date.now() - item.timestamp.getTime()) / (1000 * 60 * 60);
        return item.status !== 'completed' || hoursSinceCompletion < 24;
      }));
    }, 24 * 60 * 60 * 1000);
  };

  const syncOrder = async (orderData: Record<string, unknown>) => {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      throw new Error('Failed to sync order');
    }
  };

  const syncMenuUpdate = async (menuData: Record<string, unknown>) => {
    const response = await fetch('/api/menu', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(menuData)
    });

    if (!response.ok) {
      throw new Error('Failed to sync menu update');
    }
  };

  const syncNotification = async (notificationData: Record<string, unknown>) => {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notificationData)
    });

    if (!response.ok) {
      throw new Error('Failed to sync notification');
    }
  };

  const retryFailedItems = () => {
    setSyncQueue(prev => prev.map(item => 
      item.status === 'failed' ? { ...item, status: 'pending' } : item
    ));
    processSyncQueue();
  };

  const clearCompletedItems = () => {
    setSyncQueue(prev => prev.filter(item => item.status !== 'completed'));
  };

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && syncQueue.some(item => item.status === 'pending' || item.status === 'failed')) {
      processSyncQueue();
    }
  }, [isOnline]);

  const getStatusIcon = (status: SyncItem['status']) => {
    switch (status) {
      case 'pending':
        return <RefreshCw className="h-4 w-4 text-yellow-500" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = (status: SyncItem['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'syncing':
        return 'Syncing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {isOnline ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-red-500" />}
            <span>Background Sync</span>
            <Badge variant={isOnline ? 'default' : 'destructive'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {isOnline ? 'Connected to internet' : 'Working offline'}
              </p>
              {lastSync && (
                <p className="text-xs text-gray-500">
                  Last sync: {lastSync.toLocaleString()}
                </p>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button
                onClick={processSyncQueue}
                disabled={!isOnline || isSyncing || syncQueue.length === 0}
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
              
              {syncQueue.some(item => item.status === 'failed') && (
                <Button
                  onClick={retryFailedItems}
                  variant="outline"
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Retry Failed
                </Button>
              )}
            </div>
          </div>

          {syncQueue.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Sync Queue ({syncQueue.length})</h4>
                <Button
                  onClick={clearCompletedItems}
                  variant="ghost"
                  size="sm"
                >
                  Clear Completed
                </Button>
              </div>
              
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {syncQueue.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(item.status)}
                      <div>
                        <p className="text-sm font-medium capitalize">{item.type.replace('_', ' ')}</p>
                        <p className="text-xs text-gray-500">
                          {item.timestamp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant={
                        item.status === 'completed' ? 'default' :
                        item.status === 'failed' ? 'destructive' :
                        item.status === 'syncing' ? 'secondary' : 'outline'
                      }>
                        {getStatusText(item.status)}
                      </Badge>
                      
                      {item.retryCount > 0 && (
                        <span className="text-xs text-gray-500">
                          Retries: {item.retryCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Export function to add items to sync queue from other components
export const addToSyncQueue = (item: Omit<SyncItem, 'id' | 'timestamp' | 'status' | 'retryCount'>) => {
  const syncItem: SyncItem = {
    ...item,
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date(),
    status: 'pending',
    retryCount: 0
  };

  const currentQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
  currentQueue.push(syncItem);
  localStorage.setItem('syncQueue', JSON.stringify(currentQueue));

  // Dispatch custom event to notify BackgroundSync component
  window.dispatchEvent(new CustomEvent('syncQueueUpdated', { detail: syncItem }));
}; 