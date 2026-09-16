const crypto = require('crypto');

// Ambiguity-free alphabet (no 0/O, 1/I/L)
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generates a pairing code like DUO-982X.
 */
function generateDuoInviteCode() {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return `DUO-${code}`;
}

/**
 * Generates a guaranteed unique pairing code not in use and not in excludeCodes.
 * @param {import('mongoose').Model} User
 * @param {string[]} excludeCodes - Codes to reject (e.g. user's previous code, partner's new code)
 */
async function generateUniqueDuoInviteCode(User, excludeCodes = []) {
  const excludeSet = new Set(
    (excludeCodes || []).filter(Boolean).map((c) => String(c).trim().toUpperCase())
  );

  for (let attempts = 0; attempts < 200; attempts++) {
    const candidate = generateDuoInviteCode();
    if (excludeSet.has(candidate)) continue;
    if (User) {
      const existing = await User.findOne({ duoInviteCode: candidate }).lean();
      if (existing) continue;
    }
    return candidate;
  }

  // Fallback if random 4-char space has collisions: 5-char code
  let fallback = 'DUO-';
  for (let i = 0; i < 5; i++) {
    fallback += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return fallback;
}

module.exports = { generateDuoInviteCode, generateUniqueDuoInviteCode };