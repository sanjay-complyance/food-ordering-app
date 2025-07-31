export interface WebSocketMessage {
  type: 'order_update' | 'menu_update' | 'notification' | 'status_change';
  data: Record<string, unknown>;
  timestamp: string;
}

export interface OrderUpdateData {
  orderId: string;
  status: string;
  message?: string;
}

export interface MenuUpdateData {
  menuId: string;
  action: 'created' | 'updated' | 'deleted';
  message?: string;
}

export interface NotificationData {
  title?: string;
  message: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
}

export interface StatusChangeData {
  message: string;
  type: string;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(message: WebSocketMessage) => void>> = new Map();
  private isConnecting = false;
  private onMessageCallback?: (message: WebSocketMessage) => void;

  constructor(private url: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.handleDisconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private handleMessage(message: WebSocketMessage) {
    const listeners = this.listeners.get(message.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(message);
        } catch (error) {
          console.error('Error in WebSocket listener:', error);
        }
      });
    }

    // Call global message callback if set
    if (this.onMessageCallback) {
      try {
        this.onMessageCallback(message);
      } catch (error) {
        console.error('Error in global WebSocket message handler:', error);
      }
    }

    // Handle specific message types
    switch (message.type) {
      case 'order_update':
        this.handleOrderUpdate(message.data as unknown as OrderUpdateData);
        break;
      case 'menu_update':
        this.handleMenuUpdate(message.data as unknown as MenuUpdateData);
        break;
      case 'notification':
        this.handleNotification(message.data as unknown as NotificationData);
        break;
      case 'status_change':
        this.handleStatusChange(message.data as unknown as StatusChangeData);
        break;
    }
  }

  private handleOrderUpdate(data: OrderUpdateData) {
    console.log('Order update received:', data);
    // Dispatch custom event for order updates
    window.dispatchEvent(new CustomEvent('orderUpdate', { detail: data }));
  }

  private handleMenuUpdate(data: MenuUpdateData) {
    console.log('Menu update received:', data);
    // Dispatch custom event for menu updates
    window.dispatchEvent(new CustomEvent('menuUpdate', { detail: data }));
  }

  private handleNotification(data: NotificationData) {
    console.log('Notification received:', data);
    // Dispatch custom event for notifications
    window.dispatchEvent(new CustomEvent('notification', { detail: data }));
  }

  private handleStatusChange(data: StatusChangeData) {
    console.log('Status change received:', data);
    // Dispatch custom event for status changes
    window.dispatchEvent(new CustomEvent('statusChange', { detail: data }));
  }

  private handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      // Dispatch custom event for connection loss
      window.dispatchEvent(new CustomEvent('websocketDisconnected'));
    }
  }

  subscribe(type: string, listener: (message: WebSocketMessage) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    this.listeners.get(type)!.add(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(type);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(type);
        }
      }
    };
  }

  setMessageCallback(callback: (message: WebSocketMessage) => void): void {
    this.onMessageCallback = callback;
  }

  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Create singleton instance
const wsClient = new WebSocketClient(
  process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001'
);

export default wsClient; 