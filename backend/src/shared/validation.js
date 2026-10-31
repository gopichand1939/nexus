import { AppError } from './errors.js';
export function text(value, name, min = 1, max = 200) {
  if (typeof value !== 'string' || value.length < min || value.length > max || value.includes('\0'))
    throw new AppError(400, 'INVALID_INPUT', `${name} must be ${min}–${max} characters.`);
  return value;
}
export function username(value) {
  const s = text(value, 'Username', 3, 32).toLowerCase();
  if (!/^[a-z0-9_]+$/.test(s)) throw new AppError(400, 'INVALID_USERNAME', 'Use letters, numbers and underscores.');
  return s;
}
export const password = value => text(value, 'Password', 12, 128);
export function matrixId(value, serverName) {
  const s = text(value, 'User ID', 4, 200);
  if (!s.startsWith('@') || !s.endsWith(`:${serverName}`) || !/^[a-z0-9_]{3,32}$/.test(s.slice(1, -(serverName.length + 1))))
    throw new AppError(400, 'INVALID_USER', 'Enter a local NEXUS user ID.');
  return s;
}
export function page(value) { return Math.max(0, Math.min(100000, Number.parseInt(value, 10) || 0)); }
