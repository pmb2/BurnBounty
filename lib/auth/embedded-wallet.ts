'use client';
import { buildBitcoinSignedMessageBuffer } from '@/lib/auth/bitcoin-message';
import { scrypt } from 'scrypt-js';

const STORAGE_KEY_PREFIX = 'burnbounty.embedded.v1';
const EXPORT_ATTEMPTS_KEY = `${STORAGE_KEY_PREFIX}.attempts`;
const MAX_FAILED_EXPORT_ATTEMPTS = 5;
const MAX_LOCK_MS = 5 * 60 * 1000;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_DKLEN = 32;

export interface EmbeddedWalletPublicInfo {
  userId: string;
  address: string;
  createdAt: string;
}

export interface EmbeddedWalletRecord extends EmbeddedWalletPublicInfo {
  encryptedWif: string;
  iv: string;
  salt: string;
}

function storageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}.${userId}`;
}

function exportAttemptsKey(userId: string) {
  return `${EXPORT_ATTEMPTS_KEY}.${userId}`;
}

interface ExportAttemptState {
  failedCount: number;
  lockUntil?: number;
  updatedAt: number;
}

function bytesToB64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function b64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

async function deriveAesKey(passphrase: string, salt: Uint8Array) {
  const passwordBytes = new TextEncoder().encode(passphrase);
  const keyBytes = await scrypt(passwordBytes, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P, SCRYPT_DKLEN);
  return crypto.subtle.importKey('raw', toArrayBuffer(keyBytes), { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

function getAttemptState(userId: string): ExportAttemptState {
  const raw = localStorage.getItem(exportAttemptsKey(userId));
  if (!raw) return { failedCount: 0, updatedAt: Date.now() };
  try {
    const parsed = JSON.parse(raw) as ExportAttemptState;
    return {
      failedCount: Number(parsed.failedCount || 0),
      lockUntil: parsed.lockUntil ? Number(parsed.lockUntil) : undefined,
      updatedAt: Number(parsed.updatedAt || Date.now())
    };
  } catch {
    return { failedCount: 0, updatedAt: Date.now() };
  }
}

function setAttemptState(userId: string, state: ExportAttemptState) {
  localStorage.setItem(exportAttemptsKey(userId), JSON.stringify(state));
}

function clearAttemptState(userId: string) {
  localStorage.removeItem(exportAttemptsKey(userId));
}

function assertNotLocked(userId: string) {
  const state = getAttemptState(userId);
  if (state.lockUntil && state.lockUntil > Date.now()) {
    const remainingMs = state.lockUntil - Date.now();
    const error = new Error('EMBEDDED_WALLET_LOCKED');
    (error as any).code = 'embedded_wallet_locked';
    (error as any).retryAfterSeconds = Math.ceil(remainingMs / 1000);
    throw error;
  }
}

function registerFailedExportAttempt(userId: string) {
  const state = getAttemptState(userId);
  const nextFailedCount = state.failedCount + 1;
  const lockMs =
    nextFailedCount >= MAX_FAILED_EXPORT_ATTEMPTS
      ? Math.min(2 ** Math.min(nextFailedCount - MAX_FAILED_EXPORT_ATTEMPTS, 8) * 1000, MAX_LOCK_MS)
      : 0;
  setAttemptState(userId, {
    failedCount: nextFailedCount,
    lockUntil: lockMs ? Date.now() + lockMs : undefined,
    updatedAt: Date.now()
  });
}

async function assertExportApproval(userId: string, requireExportApproval?: (userId: string) => Promise<boolean>) {
  if (!requireExportApproval) return;
  const approved = await requireExportApproval(userId);
  if (!approved) {
    const error = new Error('EXPORT_NOT_ALLOWED');
    (error as any).code = 'export_not_allowed';
    throw error;
  }
}

export async function createEmbeddedWalletForUser(userId: string, passphrase: string): Promise<EmbeddedWalletRecord> {
  const bitcore = await import('bitcore-lib-cash');
  const privateKey = new bitcore.default.PrivateKey(undefined, bitcore.default.Networks.testnet);
  const wif = privateKey.toWIF();
  const address = privateKey.toAddress(bitcore.default.Networks.testnet).toString();

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveAesKey(passphrase, salt);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, new TextEncoder().encode(wif));
  const encryptedBytes = new Uint8Array(encrypted);

  const record: EmbeddedWalletRecord = {
    userId,
    address,
    createdAt: new Date().toISOString(),
    encryptedWif: bytesToB64(encryptedBytes),
    iv: bytesToB64(iv),
    salt: bytesToB64(salt)
  };

  localStorage.setItem(storageKey(userId), JSON.stringify(record));
  return record;
}

export function getEmbeddedWalletPublicInfo(userId: string): EmbeddedWalletPublicInfo | null {
  const raw = localStorage.getItem(storageKey(userId));
  if (!raw) return null;
  const parsed = JSON.parse(raw) as EmbeddedWalletRecord;
  return { userId: parsed.userId, address: parsed.address, createdAt: parsed.createdAt };
}

export async function exportEmbeddedWallet(
  userId: string,
  passphrase: string,
  options?: { requireExportApproval?: (userId: string) => Promise<boolean> }
): Promise<string> {
  if (!options?.requireExportApproval) {
    const error = new Error('EXPORT_NOT_ALLOWED');
    (error as any).code = 'export_not_allowed';
    throw error;
  }
  await assertExportApproval(userId, options.requireExportApproval);
  return decryptEmbeddedWalletWif(userId, passphrase);
}

async function decryptEmbeddedWalletWif(userId: string, passphrase: string): Promise<string> {
  assertNotLocked(userId);
  const raw = localStorage.getItem(storageKey(userId));
  if (!raw) throw new Error('EMBEDDED_WALLET_NOT_FOUND');
  try {
    const rec = JSON.parse(raw) as EmbeddedWalletRecord;
    const iv = b64ToBytes(rec.iv);
    const salt = b64ToBytes(rec.salt);
    const key = await deriveAesKey(passphrase, salt);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(b64ToBytes(rec.encryptedWif)));
    clearAttemptState(userId);
    return new TextDecoder().decode(decrypted);
  } catch {
    registerFailedExportAttempt(userId);
    throw new Error('EMBEDDED_WALLET_DECRYPT_FAILED');
  }
}

export async function signWithEmbeddedWallet(userId: string, passphrase: string, message: string): Promise<string> {
  const wif = await decryptEmbeddedWalletWif(userId, passphrase);
  return signBchAuthMessageClient(wif, message);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function signBchAuthMessageClient(wif: string, message: string): Promise<string> {
  const bitcore = await import('bitcore-lib-cash');
  const privateKey = bitcore.default.PrivateKey.fromWIF(wif);
  const hash = hashBitcoinSignedMessageClient(bitcore.default, message);
  const signed = bitcore.default.crypto.ECDSA.sign(hash, privateKey);
  const compactSigned = bitcore.default.crypto.ECDSA.calci(hash, signed, privateKey.toPublicKey());
  return compactSigned.toCompact().toString('base64');
}

function hashBitcoinSignedMessageClient(bitcore: any, message: string): Buffer {
  const B = bitcore.deps.Buffer;
  const data = buildBitcoinSignedMessageBuffer(B, message);
  return bitcore.crypto.Hash.sha256sha256(data);
}
