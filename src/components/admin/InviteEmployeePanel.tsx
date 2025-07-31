"use client";

import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export default function InviteEmployeePanel() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [invites, setInvites] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);

  const fetchInvites = async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/admin/invite");
      const data = await res.json();
      setInvites(data.invites || []);
    } catch {}
    setFetching(false);
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setResult("Invite sent!");
        setEmail("");
        fetchInvites();
      } else {
        const data = await res.json();
        setResult(data.error || "Failed to send invite");
      }
    } catch {
      setResult("Failed to send invite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 bg-white shadow-md">
      <h2 className="text-lg font-semibold mb-4">Invite Employee</h2>
      <form onSubmit={handleInvite} className="flex gap-2 mb-4">
        <Input
          type="email"
          placeholder="employee@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-64"
        />
        <Button type="submit" disabled={loading || !email}>
          {loading ? "Inviting..." : "Send Invite"}
        </Button>
      </form>
      {result && <div className="mb-2 text-sm">{result}</div>}
      <div className="mt-4">
        <h3 className="font-semibold mb-2">Recent Invites</h3>
        {fetching ? (
          <div>Loading...</div>
        ) : invites.length === 0 ? (
          <div className="text-sm text-gray-500">No invites yet.</div>
        ) : (
          <table className="w-full text-sm border">
            <thead>
              <tr>
                <th className="text-left p-1 border-b">Email</th>
                <th className="text-left p-1 border-b">Status</th>
                <th className="text-left p-1 border-b">Expires</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <tr key={invite._id}>
                  <td className="p-1 border-b">{invite.email}</td>
                  <td className="p-1 border-b">{invite.status}</td>
                  <td className="p-1 border-b">{new Date(invite.expiresAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
} 