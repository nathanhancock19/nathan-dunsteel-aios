// Usage: node scripts/hash-password.mjs "<your password>"
// Prints a bcrypt hash to copy into .env.local as AIOS_USER_PASSWORD_HASH.

import bcrypt from "bcryptjs"

const password = process.argv[2]
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs "<your password>"')
  process.exit(1)
}

const hash = await bcrypt.hash(password, 12)
console.log(hash)
