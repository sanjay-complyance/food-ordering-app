interface SendPulseConfig {
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  fromEmail: string;
  fromName: string;
}

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface OrderItem {
  name: string;
  description: string;
  quantity: number;
}

interface OrderData {
  _id: string;
  orderDate: string;
  status: string;
  items: OrderItem[];
}

interface MenuItem {
  name: string;
  description: string;
  price?: number;
}

interface MenuData {
  name: string;
  description?: string;
  items: MenuItem[];
}

class SendPulseClient {
  private config: SendPulseConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: SendPulseConfig) {
    this.config = config;
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/oauth/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: this.config.apiKey,
          client_secret: this.config.apiSecret,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token as string;
      this.tokenExpiry = Date.now() + ((data.expires_in as number) * 1000) - 60000; // Expire 1 minute early

      return this.accessToken;
    } catch (error) {
      console.error('Failed to get SendPulse access token:', error);
      throw error;
    }
  }

  async sendEmail(emailData: EmailData): Promise<void> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(`${this.config.apiUrl}/smtp/emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: {
            html: emailData.html,
            text: emailData.text || this.stripHtml(emailData.html),
            subject: emailData.subject,
            from: {
              name: this.config.fromName,
              email: this.config.fromEmail,
            },
            to: [
              {
                name: emailData.to.split('@')[0], // Use email prefix as name
                email: emailData.to,
              },
            ],
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to send email: ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      console.log('Email sent successfully via SendPulse');
    } catch (error) {
      console.error('Failed to send email via SendPulse:', error);
      throw error;
    }
  }

  async sendOrderConfirmation(to: string, orderData: OrderData): Promise<void> {
    const subject = 'Order Confirmation - Daily Lunch Ordering';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Order Confirmation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .order-details { background: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; }
            .item { padding: 10px 0; border-bottom: 1px solid #eee; }
            .item:last-child { border-bottom: none; }
            .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .status.pending { background: #fff3cd; color: #856404; }
            .status.confirmed { background: #d4edda; color: #155724; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmation</h1>
              <p>Thank you for your order!</p>
            </div>
            
            <div class="order-details">
              <h2>Order Details</h2>
              <p><strong>Order ID:</strong> ${orderData._id}</p>
              <p><strong>Order Date:</strong> ${new Date(orderData.orderDate).toLocaleDateString()}</p>
              <p><strong>Status:</strong> <span class="status ${orderData.status}">${orderData.status.toUpperCase()}</span></p>
              
              <h3>Items Ordered:</h3>
              ${orderData.items.map((item: OrderItem) => `
                <div class="item">
                  <strong>${item.name}</strong> - ${item.description}
                  <br><small>Quantity: ${item.quantity}</small>
                </div>
              `).join('')}
            </div>
            
            <div class="footer">
              <p>This is an automated message from the Daily Lunch Ordering System.</p>
              <p>If you have any questions, please contact your administrator.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({ to, subject, html });
  }

  async sendOrderUpdate(to: string, orderData: OrderData, previousStatus: string): Promise<void> {
    const subject = 'Order Status Update - Daily Lunch Ordering';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Order Status Update</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .update-details { background: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; }
            .status-change { background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .status.pending { background: #fff3cd; color: #856404; }
            .status.confirmed { background: #d4edda; color: #155724; }
            .status.cancelled { background: #f8d7da; color: #721c24; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Status Update</h1>
              <p>Your order status has been updated.</p>
            </div>
            
            <div class="update-details">
              <h2>Order Details</h2>
              <p><strong>Order ID:</strong> ${orderData._id}</p>
              <p><strong>Order Date:</strong> ${new Date(orderData.orderDate).toLocaleDateString()}</p>
              
              <div class="status-change">
                <h3>Status Change</h3>
                <p><strong>Previous Status:</strong> <span class="status ${previousStatus}">${previousStatus.toUpperCase()}</span></p>
                <p><strong>New Status:</strong> <span class="status ${orderData.status}">${orderData.status.toUpperCase()}</span></p>
              </div>
              
              <h3>Items Ordered:</h3>
              ${orderData.items.map((item: OrderItem) => `
                <div class="item">
                  <strong>${item.name}</strong> - ${item.description}
                  <br><small>Quantity: ${item.quantity}</small>
                </div>
              `).join('')}
            </div>
            
            <div class="footer">
              <p>This is an automated message from the Daily Lunch Ordering System.</p>
              <p>If you have any questions, please contact your administrator.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({ to, subject, html });
  }

  async sendMenuUpdate(to: string, menuData: MenuData): Promise<void> {
    const subject = 'Menu Update - Daily Lunch Ordering';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Menu Update</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .menu-details { background: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; }
            .item { padding: 10px 0; border-bottom: 1px solid #eee; }
            .item:last-child { border-bottom: none; }
            .price { color: #28a745; font-weight: bold; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Menu Update</h1>
              <p>The menu has been updated with new items!</p>
            </div>
            
            <div class="menu-details">
              <h2>${menuData.name}</h2>
              ${menuData.description ? `<p>${menuData.description}</p>` : ''}
              
              <h3>Available Items:</h3>
              ${menuData.items.map((item: MenuItem) => `
                <div class="item">
                  <strong>${item.name}</strong>
                  <p>${item.description}</p>
                  ${item.price ? `<p class="price">$${item.price.toFixed(2)}</p>` : ''}
                </div>
              `).join('')}
            </div>
            
            <div class="footer">
              <p>This is an automated message from the Daily Lunch Ordering System.</p>
              <p>Please visit the application to place your order.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({ to, subject, html });
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

// Create singleton instance
const sendPulseClient = new SendPulseClient({
  apiUrl: process.env.SENDPULSE_API_URL || 'https://api.sendpulse.com',
  apiKey: process.env.SENDPULSE_API_KEY || '',
  apiSecret: process.env.SENDPULSE_API_SECRET || '',
  fromEmail: process.env.SENDPULSE_FROM_EMAIL || 'noreply@yourdomain.com',
  fromName: process.env.SENDPULSE_FROM_NAME || 'Daily Lunch Ordering System',
});

export default sendPulseClient; 