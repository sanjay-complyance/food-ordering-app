import { useEffect, useCallback, useRef } from 'react';
import wsClient, { WebSocketMessage } from '@/lib/websocket';
import { useToast } from '@/lib/toast';

export function useWebSocket() {
  const { toast } = useToast();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const connect = useCallback(async () => {
    try {
      await wsClient.connect();
      console.log('WebSocket connected via hook');
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to real-time updates',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const disconnect = useCallback(() => {
    wsClient.disconnect();
  }, []);

  const subscribe = useCallback((type: string, listener: (message: WebSocketMessage) => void) => {
    return wsClient.subscribe(type, listener);
  }, []);

  const send = useCallback((message: WebSocketMessage) => {
    wsClient.send(message);
  }, []);

  const isConnected = useCallback(() => {
    return wsClient.isConnected();
  }, []);

  // Set up global message handler with toast notifications
  useEffect(() => {
    wsClient.setMessageCallback((message: WebSocketMessage) => {
      switch (message.type) {
        case 'order_update':
          const orderData = message.data as unknown as { orderId: string; status: string; message?: string };
          toast({
            title: 'Order Update',
            description: orderData.message || `Your order status has been updated to: ${orderData.status}`,
            variant: 'default'
          });
          break;
        case 'menu_update':
          const menuData = message.data as unknown as { action: string; message?: string };
          toast({
            title: 'Menu Updated',
            description: menuData.message || 'The menu has been updated. Please refresh to see changes.',
            variant: 'default'
          });
          break;
        case 'notification':
          const notificationData = message.data as unknown as { title?: string; message: string; variant?: string };
          toast({
            title: notificationData.title || 'New Notification',
            description: notificationData.message,
            variant: (notificationData.variant as 'default' | 'destructive' | 'success' | 'warning') || 'default'
          });
          break;
        case 'status_change':
          const statusData = message.data as unknown as { message: string };
          toast({
            title: 'Status Change',
            description: statusData.message,
            variant: 'default'
          });
          break;
      }
    });

    // Listen for WebSocket disconnection
    const handleDisconnect = () => {
      toast({
        title: 'Connection Lost',
        description: 'Real-time updates are temporarily unavailable. Please refresh the page.',
        variant: 'destructive'
      });
    };

    window.addEventListener('websocketDisconnected', handleDisconnect);

    return () => {
      window.removeEventListener('websocketDisconnected', handleDisconnect);
    };
  }, [toast]);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [connect]);

  return {
    connect,
    disconnect,
    subscribe,
    send,
    isConnected
  };
} 