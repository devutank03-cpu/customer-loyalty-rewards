import crypto from 'crypto'

/**
 * Normalizes a box code by trimming whitespace and converting to uppercase.
 */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase()
}

/**
 * Normalizes contact info (email or phone) by trimming whitespace and lowercasing.
 */
export function normalizeContact(contact: string): string {
  return contact.trim().toLowerCase()
}

/**
 * Generates a cryptographically random box code in format BOX-XXXX-XXXX
 */
export function generateBoxCode(): string {
  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase()
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase()
  return `BOX-${part1}-${part2}`
}

/**
 * Generates a set of unique cryptographically random box codes
 */
export function generateUniqueBoxCodes(quantity: number): string[] {
  const codes = new Set<string>()
  while (codes.size < quantity) {
    codes.add(generateBoxCode())
  }
  return Array.from(codes)
}
