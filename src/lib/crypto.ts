import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ''; 
const IV_LENGTH = 16; // For AES, this is always 16
const AUTH_TAG_LENGTH = 16;
const VERSION_GCM = 'v2';

export function encryptData(text: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
  }
  
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  return `${VERSION_GCM}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptData(text: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
  }

  const textParts = text.split(':');
  if (textParts[0] === VERSION_GCM) {
    const [, ivHex = '', authTagHex = '', encryptedHex = ''] = textParts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH || encryptedText.length === 0) {
      throw new Error('Invalid encrypted text format');
    }

    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  // Backward compatibility for previously persisted AES-256-CBC payloads.
  const ivHash = textParts.shift();
  if (!ivHash) throw new Error('Invalid encrypted text format');
  const iv = Buffer.from(ivHash, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  if (iv.length !== IV_LENGTH || encryptedText.length === 0) {
    throw new Error('Invalid encrypted text format');
  }
  const decipher = createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
