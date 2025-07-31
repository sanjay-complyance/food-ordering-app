"use client";

import { useState, useEffect } from "react";
import { Card } from "../ui/card";

export default function AnalyticsPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load analytics");
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">Loading analytics...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <Card className="p-6 bg-white shadow-md">
      <h2 className="text-lg font-semibold mb-4">Analytics Dashboard</h2>
      <div className="mb-6">
        <h3 className="font-semibold mb-2">User Engagement</h3>
        <div className="flex gap-8">
          <div>Active Users (30d): <b>{data.activeUsers}</b></div>
          <div>Total Users: <b>{data.totalUsers}</b></div>
          <div>Engagement Rate: <b>{(data.engagementRate * 100).toFixed(1)}%</b></div>
        </div>
      </div>
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Order History (Last 30 Days)</h3>
        <table className="w-full text-sm border">
          <thead>
            <tr>
              <th className="text-left p-1 border-b">Date</th>
              <th className="text-left p-1 border-b">Orders</th>
            </tr>
          </thead>
          <tbody>
            {data.orderHistory.map((row: any) => (
              <tr key={row._id}>
                <td className="p-1 border-b">{row._id}</td>
                <td className="p-1 border-b">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Popular Menu Items (30d)</h3>
        <table className="w-full text-sm border">
          <thead>
            <tr>
              <th className="text-left p-1 border-b">Item</th>
              <th className="text-left p-1 border-b">Ordered</th>
            </tr>
          </thead>
          <tbody>
            {data.popularItems.map((row: any) => (
              <tr key={row._id}>
                <td className="p-1 border-b">{row._id}</td>
                <td className="p-1 border-b">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
} 