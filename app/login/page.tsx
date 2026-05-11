"use client"

import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, Suspense, useState } from "react"
import Image from "next/image"
import { LogIn } from "lucide-react"

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard"

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError("")

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid username or password")
      setPending(false)
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(180deg, #0F2030 0%, #15293D 100%)", color: "#F0F4F7" }}
    >
      {/* subtle gradient orb behind the card */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 -z-0 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, #FFA300 0%, transparent 70%)" }}
        aria-hidden
      />

      <div
        className="relative z-10 w-full max-w-sm rounded-xl border p-6 shadow-2xl"
        style={{ background: "#15293D", borderColor: "#2A4A66" }}
      >
        <div className="mb-5 flex flex-col items-center gap-3">
          <div className="rounded-lg bg-white/95 px-4 py-3 shadow-sm">
            <Image src="/logo.png" alt="Dunsteel" width={170} height={45} priority />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-tight" style={{ color: "#F0F4F7" }}>
              Welcome back
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: "#93A4B5" }}>
              Sign in to AIOS
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="username" className="mb-1 block text-xs font-medium uppercase tracking-wider" style={{ color: "#93A4B5" }}>
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors"
              style={{ background: "#0F2030", borderColor: "#2A4A66", color: "#F0F4F7" }}
              onFocus={(e) => (e.target.style.borderColor = "#FFA300")}
              onBlur={(e) => (e.target.style.borderColor = "#2A4A66")}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-medium uppercase tracking-wider" style={{ color: "#93A4B5" }}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors"
              style={{ background: "#0F2030", borderColor: "#2A4A66", color: "#F0F4F7" }}
              onFocus={(e) => (e.target.style.borderColor = "#FFA300")}
              onBlur={(e) => (e.target.style.borderColor = "#2A4A66")}
            />
          </div>

          {error ? (
            <p className="rounded border px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#FCA5A5" }} role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: "#FFA300", color: "#102536" }}
          >
            {pending ? "Signing in..." : (
              <>
                <LogIn className="h-4 w-4" />
                Sign in
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px]" style={{ color: "#647A8E" }}>
          Dunsteel AI Operating System
        </p>
      </div>
    </main>
  )
}
