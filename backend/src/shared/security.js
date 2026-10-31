import { randomBytes, createHash, createCipheriv, createDecipheriv, timingSafeEqual } from 'node:crypto';
export const newToken = () => randomBytes(32).toString('base64url');
export const hashToken = value => createHash('sha256').update(value).digest('hex');
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function createTokenVault(keyHex) {
  if (!/^[a-f0-9]{64}$/i.test(keyHex)) throw new Error('TOKEN_ENCRYPTION_KEY must contain 64 hex characters');
  const key = Buffer.from(keyHex, 'hex');
  return {
    seal(value) {
      const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
      const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64');
    },
    open(value) {
      const data = Buffer.from(value, 'base64');
      if (data.length < 28) throw new Error('Invalid encrypted credential');
      const cipher = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
      cipher.setAuthTag(data.subarray(12, 28));
      return Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString('utf8');
    }
  };
}
