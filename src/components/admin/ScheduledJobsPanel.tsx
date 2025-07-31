"use client";

import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export default function ScheduledJobsPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [menuTime, setMenuTime] = useState("11:00");
  const [orderTime, setOrderTime] = useState("10:30");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    // Fetch current settings
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setMenuTime(data.settings.menuUpdateReminderTime || "11:00");
          setOrderTime(data.settings.orderReminderTime || "10:30");
        }
      });
  }, []);

  const runCron = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/cron", { method: "POST" });
      const data = await res.json();
      setResult(JSON.stringify(data.results, null, 2));
    } catch (error) {
      console.error('Error running scheduled job:', error);
      setResult("Error running scheduled jobs");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuUpdateReminderTime: menuTime,
          orderReminderTime: orderTime,
        }),
      });
      if (res.ok) {
        setSaveMsg("Settings saved!");
      } else {
        setSaveMsg("Failed to save settings");
      }
    } catch {
      setSaveMsg("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 bg-white shadow-md">
      <h2 className="text-lg font-semibold mb-4">Scheduled Jobs & Reminders</h2>
      <div className="mb-4">
        <Button onClick={runCron} disabled={loading}>
          {loading ? "Running..." : "Run Scheduled Jobs Now"}
        </Button>
        {result && (
          <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-x-auto">{result}</pre>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveSettings();
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="menuTime" className="block text-sm font-medium mb-1">Menu Update Reminder Time</label>
          <Input
            id="menuTime"
            type="time"
            value={menuTime}
            onChange={(e) => setMenuTime(e.target.value)}
            className="w-40"
            required
          />
        </div>
        <div>
          <label htmlFor="orderTime" className="block text-sm font-medium mb-1">Order Reminder Time</label>
          <Input
            id="orderTime"
            type="time"
            value={orderTime}
            onChange={(e) => setOrderTime(e.target.value)}
            className="w-40"
            required
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Reminder Times"}
        </Button>
        {saveMsg && <div className="text-sm mt-2">{saveMsg}</div>}
      </form>
    </Card>
  );
} 