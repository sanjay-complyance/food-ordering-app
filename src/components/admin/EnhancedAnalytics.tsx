"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  Download,
  Filter
} from "lucide-react";

interface AnalyticsData {
  orders: {
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  users: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  revenue: {
    total: number;
    thisWeek: number;
    thisMonth: number;
    averageOrderValue: number;
  };
  menu: {
    totalItems: number;
    activeItems: number;
    popularItems: Array<{
      name: string;
      orderCount: number;
    }>;
  };
  trends: {
    dailyOrders: Array<{
      date: string;
      count: number;
    }>;
    weeklyRevenue: Array<{
      week: string;
      revenue: number;
    }>;
  };
}

export function EnhancedAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7d");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics?range=${dateRange}`);
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (format: "csv" | "json") => {
    try {
      const response = await fetch(`/api/admin/analytics/export?format=${format}&range=${dateRange}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `analytics-${dateRange}.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to export data:", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Analytics Dashboard</h2>
          <div className="flex items-center space-x-2">
            <Button variant="outline" disabled>
              <Filter className="h-4 w-4 mr-2" />
              Loading...
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-600">No analytics data available</h3>
        <p className="text-gray-500 mt-2">Analytics data will appear here once orders are placed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Analytics Dashboard</h2>
        <div className="flex items-center space-x-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button variant="outline" onClick={() => exportData("csv")}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => exportData("json")}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.orders.total}</div>
                <p className="text-xs text-muted-foreground">
                  +{analyticsData.orders.today} today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.users.active}</div>
                <p className="text-xs text-muted-foreground">
                  +{analyticsData.users.newThisMonth} this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${analyticsData.revenue.total.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  +${analyticsData.revenue.thisMonth.toFixed(2)} this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Menu Items</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.menu.activeItems}</div>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.menu.totalItems} total items
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Pending</span>
                    <Badge variant="secondary">{analyticsData.orders.pending}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Confirmed</span>
                    <Badge variant="default">{analyticsData.orders.confirmed}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Cancelled</span>
                    <Badge variant="destructive">{analyticsData.orders.cancelled}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Popular Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.menu.popularItems.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{item.name}</span>
                      <Badge variant="outline">{item.orderCount} orders</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Today</p>
                  <p className="text-2xl font-bold">{analyticsData.orders.today}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-2xl font-bold">{analyticsData.orders.thisWeek}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold">{analyticsData.orders.thisMonth}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">Pending</span>
                    </div>
                    <span className="font-medium">{analyticsData.orders.pending}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Confirmed</span>
                    </div>
                    <span className="font-medium">{analyticsData.orders.confirmed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Cancelled</span>
                    </div>
                    <span className="font-medium">{analyticsData.orders.cancelled}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{analyticsData.users.total}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">{analyticsData.users.active}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">New This Month</p>
                  <p className="text-2xl font-bold">{analyticsData.users.newThisMonth}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">${analyticsData.revenue.total.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-2xl font-bold">${analyticsData.revenue.thisWeek.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold">${analyticsData.revenue.thisMonth.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Order Value</p>
                  <p className="text-2xl font-bold">${analyticsData.revenue.averageOrderValue.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-center space-x-2">
                  {analyticsData.trends.weeklyRevenue.map((week, index) => (
                    <div
                      key={index}
                      className="bg-blue-500 rounded-t"
                      style={{
                        height: `${(week.revenue / Math.max(...analyticsData.trends.weeklyRevenue.map(w => w.revenue))) * 200}px`,
                        width: "20px"
                      }}
                      title={`Week ${week.week}: $${week.revenue.toFixed(2)}`}
                    ></div>
                  ))}
                </div>
                <div className="flex justify-center mt-4 space-x-4">
                  {analyticsData.trends.weeklyRevenue.map((week, index) => (
                    <span key={index} className="text-xs text-muted-foreground">
                      W{week.week}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Order Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-center space-x-1">
                {analyticsData.trends.dailyOrders.map((day, index) => (
                  <div
                    key={index}
                    className="bg-green-500 rounded-t"
                    style={{
                      height: `${(day.count / Math.max(...analyticsData.trends.dailyOrders.map(d => d.count))) * 200}px`,
                      width: "16px"
                    }}
                    title={`${day.date}: ${day.count} orders`}
                  ></div>
                ))}
              </div>
              <div className="flex justify-center mt-4 space-x-2">
                {analyticsData.trends.dailyOrders.map((day, index) => (
                  <span key={index} className="text-xs text-muted-foreground">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 