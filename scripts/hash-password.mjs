// Usage: node scripts/hash-password.mjs "<your password>"
// Prints a bcrypt hash with $ characters escaped, ready to paste into
// .env.local as: AIOS_USER_PASSWORD_HASH=<output>
// The escaping is required because Next.js's @next/env runs dotenv-expand,
// which would otherwise interpret the bcrypt $-prefixed segments as variable
// references and silently drop them.

import bcrypt from "bcryptjs"

const password = process.argv[2]
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs "<your password>"')
  process.exit(1)
}

const hash = await bcrypt.hash(password, 12)
const escaped = hash.replaceAll("$", "\\$")
console.log(escaped)
