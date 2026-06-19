import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // standard for GCM

/**
 * Derives a secure 32-byte key from the ENCRYPTION_KEY environment variable.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || 'dashmint-dev-fallback-encryption-key-2026';
  return crypto.scryptSync(secret, 'dashmint-salt-2026', 32);
}

/**
 * Encrypts a string value using AES-256-GCM.
 * Returns a colon-separated string of the format `iv:authTag:ciphertext` in hexadecimal.
 */
export function encrypt(text: string): string {
  if (!text) return '';

  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a string value using AES-256-GCM.
 * Falls back to returning the input if the text is not format-aligned (for legacy/plain-text database compatibility).
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return '';

  const parts = ciphertext.split(':');
  // If it's not a 3-part colon-delimited string, treat it as legacy plain-text
  if (parts.length !== 3) {
    return ciphertext;
  }

  try {
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed, falling back to original ciphertext:', error);
    return ciphertext;
  }
}
