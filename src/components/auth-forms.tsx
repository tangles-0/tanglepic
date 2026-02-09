"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function AuthForms() {
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignUpError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();

    if (!email || !password) {
      setSignUpError("Email and password are required.");
      return;
    }

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setSignUpError(payload.error ?? "Unable to sign up.");
      return;
    }

    await signIn("credentials", {
      email,
      password,
      callbackUrl: "/gallery",
    });
  }

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignInError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();

    if (!email || !password) {
      setSignInError("Email and password are required.");
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/gallery",
      redirect: true,
    });

    if (result?.error) {
      setSignInError("Invalid credentials.");
    }
  }

  return (
    <section className="grid gap-6 rounded-md border border-neutral-200 p-4 md:grid-cols-2">
      <div className="space-y-3">
        <h2 className="text-lg font-medium">Create an account</h2>
        <form onSubmit={handleSignUp} className="space-y-3">
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="w-full rounded border px-3 py-2"
          />
          <input
            name="password"
            type="password"
            placeholder="Password (min 8 chars)"
            className="w-full rounded border px-3 py-2"
          />
          <button className="rounded bg-black px-4 py-2 text-white" type="submit">
            Sign up
          </button>
          {signUpError ? (
            <p className="text-xs text-red-600">{signUpError}</p>
          ) : null}
        </form>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Sign in</h2>
        <form onSubmit={handleSignIn} className="space-y-3">
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="w-full rounded border px-3 py-2"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="w-full rounded border px-3 py-2"
          />
          <button className="rounded bg-black px-4 py-2 text-white" type="submit">
            Sign in
          </button>
          {signInError ? (
            <p className="text-xs text-red-600">{signInError}</p>
          ) : null}
        </form>
      </div>
    </section>
  );
}

