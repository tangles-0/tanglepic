"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function AuthForms() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignUpError(null);

    const formData = new FormData(event.currentTarget);
    const username = formData.get("username")?.toString().trim();
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();
    const confirmPassword = formData.get("confirmPassword")?.toString();

    if (!username || !email || !password || !confirmPassword) {
      setSignUpError("Username, email, and password are required.");
      return;
    }

    const emailRegex =
      /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!emailRegex.test(email)) {
      setSignUpError("Email format is invalid.");
      return;
    }

    if (username.length < 3) {
      setSignUpError("Username must be at least 3 characters.");
      return;
    }

    if (password.length <= 6 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setSignUpError("Password must be >6 chars and include letters and numbers.");
      return;
    }

    if (password !== confirmPassword) {
      setSignUpError("Passwords do not match.");
      return;
    }

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, confirmPassword }),
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
      redirect: false,
    });

    if (!result || result.error) {
      setSignInError("Invalid credentials.");
      return;
    }

    router.push("/gallery");
  }

  return (
    <section className="space-y-4 rounded-md border border-neutral-200 p-4">
      <div className="flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded px-3 py-1 ${
            mode === "login" ? "bg-black text-white" : "border border-neutral-200"
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded px-3 py-1 ${
            mode === "signup" ? "bg-black text-white" : "border border-neutral-200"
          }`}
        >
          Sign up
        </button>
      </div>

      {mode === "signup" ? (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Create an account</h2>
          <form onSubmit={handleSignUp} className="space-y-3">
            <input
              name="username"
              type="text"
              placeholder="Display name (min 3 chars)"
              className="w-full rounded border px-3 py-2"
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              className="w-full rounded border px-3 py-2"
            />
            <input
              name="password"
              type="password"
              placeholder="Password (letters + numbers)"
              className="w-full rounded border px-3 py-2"
            />
            <input
              name="confirmPassword"
              type="password"
              placeholder="Confirm password"
              className="w-full rounded border px-3 py-2"
            />
            <p className="text-xs text-neutral-500">
              We never send emails or share them. They are only used for account recovery — use a
              fake one if you want.
            </p>
            <button className="rounded bg-black px-4 py-2 text-white" type="submit">
              Sign up
            </button>
            {signUpError ? (
              <p className="text-xs text-red-600">{signUpError}</p>
            ) : null}
          </form>
        </div>
      ) : (
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
      )}
    </section>
  );
}

