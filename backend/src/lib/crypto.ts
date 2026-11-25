const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

const FAST_ITERATIONS = 25_000; // Safe & fast within Cloudflare Workers Free 10ms CPU budget
const LEGACY_ITERATIONS = 100_000;

/** Hash password using PBKDF2-SHA256 via Web Crypto API (Cloudflare Workers compatible). */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: FAST_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return `v2:${toHex(salt)}:${toHex(derived)}`;
}

/** Verify password against stored PBKDF2-SHA256 hash (supports both v2 and legacy hashes). */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  let iterations = LEGACY_ITERATIONS;
  let saltHex = '';
  let hashHex = '';

  if (storedHash.startsWith('v2:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    iterations = FAST_ITERATIONS;
    saltHex = parts[1];
    hashHex = parts[2];
  } else {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;
    saltHex = parts[0];
    hashHex = parts[1];
  }

  const salt = fromHex(saltHex);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return toHex(derived) === hashHex;
}

export function generateId(): string {
  return crypto.randomUUID();
}
