import { auth } from "./auth"

export async function requireSession() {
  const session = await auth()
  if (!session) {
    throw new Response("Unauthorized", { status: 401 })
  }
  return session
}
