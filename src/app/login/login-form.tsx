"use client";

import * as React from "react";
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { Loader2 } from "lucide-react";

import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client/api";
import { clientAuth } from "@/lib/client/firebase";

const FRIENDLY: Record<string, string> = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/user-disabled": "This account has been disabled.",
};

export function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "error" | "info"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const auth = await clientAuth();
      const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
      await api("/api/auth/session", { method: "POST", body: { idToken: await user.getIdToken() } });
      await signOut(auth);
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the server re-checks the session
      window.location.assign("/");
    } catch (err) {
      const code = (err as { code?: string }).code;
      setMessage({ tone: "error", text: (code && FRIENDLY[code]) || (err as Error).message });
      setBusy(false);
    }
  }

  async function reset() {
    if (!email.trim()) return setMessage({ tone: "error", text: "Enter your email first." });
    try {
      await sendPasswordResetEmail(await clientAuth(), email.trim());
    } catch {
      /* same response either way — don't reveal whether the account exists */
    }
    setMessage({ tone: "info", text: "If that account exists, a reset link has been sent." });
  }

  return (
    <Card className="w-full max-w-sm gap-6 p-6">
      <div className="flex justify-center rounded-xl bg-sidebar p-4">
        <BrandLogo />
      </div>
      <div>
        <h1 className="text-lg font-semibold">Super Admin sign in</h1>
        <p className="text-sm text-muted-foreground">Access is limited to the Channeliam administrator.</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {message && <p role={message.tone === "error" ? "alert" : "status"} className={message.tone === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message.text}</p>}
        <Button type="submit" size="lg" disabled={busy}>
          {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
          Sign in
        </Button>
        <button type="button" onClick={reset} className="text-sm text-muted-foreground hover:text-foreground">Forgot password?</button>
      </form>
      <p className="flex justify-center gap-4 text-xs text-muted-foreground">
        <a href="/privacy-policy" className="hover:text-foreground">Privacy Policy</a>
        <a href="/terms-of-service" className="hover:text-foreground">Terms of Service</a>
      </p>
    </Card>
  );
}
