/**
 * Generates a mock UUIDv7 compliant string (timestamp-prefixed for SQLite B-tree monotonicity).
 * Structure: 32 hex chars with standard 8-4-4-4-12 hyphenation.
 */
export function generateUUIDv7(): string {
  const timestamp = Date.now();
  const timeHex = timestamp.toString(16).padStart(12, '0');
  
  // 48 bits timestamp (12 hex), 4 bits version (7), 12 bits random, 2 bits variant (8), 62 bits random
  const r1 = Math.floor(Math.random() * 0x1000).toString(16).padStart(3, '0');
  const r2 = (0x8000 | Math.floor(Math.random() * 0x4000)).toString(16);
  const r3 = Math.floor(Math.random() * 0x1000000000000).toString(16).padStart(12, '0');

  const part1 = timeHex.slice(0, 8);
  const part2 = timeHex.slice(8, 12);
  const part3 = `7${r1}`;
  const part4 = r2;
  const part5 = r3;

  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

/**
 * Deterministic hash for tokens and identifiers (mimics sha256 in local SQLite)
 */
export function hashValue(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `hash_${hex}_${value.length}`;
}

/**
 * LGPD Privacy by Design Opaque Token Generator
 * RF-7.1: Strictly prohibits personal data in the QR Code.
 * Format: school_<tenant>:student:<uuidv7>:v1
 */
export function generateOpaqueQrToken(schoolId: string, studentId: string): string {
  const tokenUuid = generateUUIDv7();
  return `${schoolId}:student:${tokenUuid}:v1`;
}

/**
 * Checks if a string conforms to the opaque QR token specification
 */
export function parseOpaqueQrToken(token: string): {
  valid: boolean;
  schoolId?: string;
  tokenUuid?: string;
  version?: string;
} {
  if (!token || typeof token !== 'string') {
    return { valid: false };
  }
  const parts = token.trim().split(':');
  if (parts.length === 4 && parts[1] === 'student' && parts[3].startsWith('v')) {
    return {
      valid: true,
      schoolId: parts[0],
      tokenUuid: parts[2],
      version: parts[3],
    };
  }
  return { valid: false };
}

/**
 * Idempotency Key for Outbox Pattern
 * Format: tenant_id:device_id:client_sequence
 */
export function generateIdempotencyKey(
  schoolId: string,
  deviceId: string,
  clientSequence: number
): string {
  return `${schoolId}:${deviceId}:${clientSequence}`;
}
