"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function InviteSignupPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Missing invite token");
      setLoading(false);
      return;
    }
    // Fetch invite info
    fetch(`/api/admin/invite?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.invites && data.invites.length > 0) {
          setInvite(data.invites[0]);
        } else {
          setError("Invalid or expired invite");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load invite");
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Signup failed");
      }
    } catch {
      setError("Signup failed");
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (success)
    return (
      <div className="p-8">
        <Card className="p-6 max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-2">Signup Complete!</h2>
          <p className="mb-2">Your account has been created. You can now <a href="/auth/login" className="text-blue-600 underline">log in</a>.</p>
        </Card>
      </div>
    );
  return (
    <div className="p-8">
      <Card className="p-6 max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-2">Accept Invite</h2>
        <p className="mb-4">You&apos;ve been invited to join as <b>{invite?.email}</b>.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit">Create Account</Button>
        </form>
        {error && <div className="text-red-600 mt-2">{error}</div>}
      </Card>
    </div>
  );
} 