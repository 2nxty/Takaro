// Room codes: 6 characters from an alphabet without look-alikes (no 0/O, 1/I/L).
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

/** A random room code (31^6 ≈ 887 million combinations; collisions are also checked on creation). */
export function generateRoomCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH * 2);
  crypto.getRandomValues(bytes);
  let out = '';
  // Rejection sampling keeps every character equally likely.
  const limit = 256 - (256 % CODE_ALPHABET.length);
  for (let i = 0; out.length < CODE_LENGTH; i++) {
    if (i >= bytes.length) {
      crypto.getRandomValues(bytes);
      i = 0;
    }
    if (bytes[i] < limit) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

/** Uppercase, without spaces or dashes. Returns null when it isn't a valid code. */
export function normalizeRoomCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const code = input.trim().toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== CODE_LENGTH) return null;
  for (const c of code) if (!CODE_ALPHABET.includes(c)) return null;
  return code;
}
