"use client";

import { getApps, initializeApp } from "firebase/app";
import { getAuth, inMemoryPersistence, setPersistence } from "firebase/auth";

/**
 * Firebase client is used ONLY to sign in and obtain an ID token. The token is
 * exchanged for an httpOnly session cookie; no auth state is kept in the browser.
 */
export async function clientAuth() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (!config.apiKey || !config.authDomain || !config.projectId) {
    throw new Error("Firebase is not configured. Set the NEXT_PUBLIC_FIREBASE_* variables.");
  }
  const app = getApps()[0] ?? initializeApp(config);
  const auth = getAuth(app);
  await setPersistence(auth, inMemoryPersistence);
  return auth;
}
