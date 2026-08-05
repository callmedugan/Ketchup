// src/pages/LoginPage.tsx

import { type FormEvent, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8080/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Unable to log in.");
        return;
      }

      console.log("Logged in:", data);

      // We'll handle storing the JWT and redirecting later.
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "1rem",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "2rem",
          border: "1px solid #ddd",
          borderRadius: "12px",
        }}
      >
        <h1>Ketchup</h1>
        <p>Log in to see when your friends are free.</p>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              style={{
                display: "block",
                width: "100%",
                boxSizing: "border-box",
                marginTop: "0.5rem",
                padding: "0.75rem",
              }}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              style={{
                display: "block",
                width: "100%",
                boxSizing: "border-box",
                marginTop: "0.5rem",
                padding: "0.75rem",
              }}
            />
          </label>

          {error && (
            <p role="alert" style={{ color: "crimson", margin: 0 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: "0.75rem",
              cursor: isLoading ? "wait" : "pointer",
            }}
          >
            {isLoading ? "Logging in..." : "Log in"}
          </button>
        </form>
      </section>
    </main>
  );
}