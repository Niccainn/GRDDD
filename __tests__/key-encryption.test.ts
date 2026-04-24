import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'node:crypto';

// GCM decrypt must fail on any tampering. Keep this file boot-order
// safe: set the env var before importing the module under test, and
// use vi.resetModules if another test in the suite has already
// loaded it with a different key.
beforeAll(() => {
  process.env.GRID_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
});

 
let mod: typeof import('../lib/crypto/key-encryption');
beforeAll(async () => {
  mod = await import('../lib/crypto/key-encryption');
});

describe('key-encryption', () => {
  describe('roundtrip', () => {
    it('encrypts and decrypts a normal string', () => {
      const plaintext = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz123456';
      const enc = mod.encryptString(plaintext);
      expect(enc).not.toContain(plaintext);
      expect(mod.decryptString(enc)).toBe(plaintext);
    });

    it('handles empty string', () => {
      const enc = mod.encryptString('');
      expect(mod.decryptString(enc)).toBe('');
    });

    it('handles unicode and emojis', () => {
      const plaintext = 'héllo 🌍 中文 \u0000 null';
      expect(mod.decryptString(mod.encryptString(plaintext))).toBe(plaintext);
    });

    it('produces different ciphertext for same plaintext (random nonce)', () => {
      const pt = 'same-input';
      const a = mod.encryptString(pt);
      const b = mod.encryptString(pt);
      expect(a).not.toBe(b);
      expect(mod.decryptString(a)).toBe(pt);
      expect(mod.decryptString(b)).toBe(pt);
    });

    it('stored form has exactly 3 base64 parts joined by "."', () => {
      const enc = mod.encryptString('x');
      const parts = enc.split('.');
      expect(parts).toHaveLength(3);
      parts.forEach(p => expect(p).toMatch(/^[A-Za-z0-9+/=]+$/));
    });
  });

  describe('tampering rejection', () => {
    it('rejects ciphertext with wrong structure', () => {
      expect(() => mod.decryptString('only-one-part')).toThrow(/Malformed/);
      expect(() => mod.decryptString('a.b')).toThrow(/Malformed/);
      expect(() => mod.decryptString('a.b.c.d')).toThrow(/Malformed/);
    });

    it('rejects flipped ciphertext byte', () => {
      const enc = mod.encryptString('sensitive');
      const [n, c, t] = enc.split('.');
      const ctBuf = Buffer.from(c, 'base64');
      ctBuf[0] ^= 0x01;
      const tampered = [n, ctBuf.toString('base64'), t].join('.');
      expect(() => mod.decryptString(tampered)).toThrow();
    });

    it('rejects flipped auth tag', () => {
      const enc = mod.encryptString('sensitive');
      const [n, c, t] = enc.split('.');
      const tagBuf = Buffer.from(t, 'base64');
      tagBuf[0] ^= 0x01;
      const tampered = [n, c, tagBuf.toString('base64')].join('.');
      expect(() => mod.decryptString(tampered)).toThrow();
    });

    it('rejects wrong nonce length', () => {
      const shortNonce = Buffer.alloc(8).toString('base64');
      expect(() =>
        mod.decryptString([shortNonce, 'AA==', Buffer.alloc(16).toString('base64')].join('.')),
      ).toThrow(/nonce/);
    });

    it('rejects wrong auth tag length', () => {
      const enc = mod.encryptString('x');
      const [n, c] = enc.split('.');
      const shortTag = Buffer.alloc(8).toString('base64');
      expect(() => mod.decryptString([n, c, shortTag].join('.'))).toThrow(/auth tag/);
    });
  });

  describe('buildKeyPreview', () => {
    it('returns **** for very short inputs', () => {
      expect(mod.buildKeyPreview('short')).toBe('****');
      expect(mod.buildKeyPreview('')).toBe('****');
    });

    it('uses sk-ant- prefix for Anthropic keys', () => {
      const preview = mod.buildKeyPreview('sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234');
      expect(preview).toMatch(/^sk-ant-\.\.\.\w{4}$/);
      expect(preview).toContain('...');
    });

    it('uses first 6 chars for non-Anthropic keys', () => {
      const preview = mod.buildKeyPreview('sk-openai-abcdefghijklmnop');
      expect(preview.startsWith('sk-ope')).toBe(true);
    });

    it('never leaks the middle of the key', () => {
      const secret = 'sk-ant-MIDDLE_SECRET_SHOULD_NOT_APPEAR_XYZA';
      const preview = mod.buildKeyPreview(secret);
      expect(preview).not.toContain('MIDDLE');
      expect(preview).not.toContain('SECRET');
    });

    it('trims whitespace', () => {
      const a = mod.buildKeyPreview('  sk-ant-aaaaaaaaaaaaABCD  ');
      const b = mod.buildKeyPreview('sk-ant-aaaaaaaaaaaaABCD');
      expect(a).toBe(b);
    });
  });
});
