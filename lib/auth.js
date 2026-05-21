// ==========================================
// 認証ユーティリティ
// - パスワードを SHA-256 でハッシュ化し、config の PASSWORD_HASH と照合
// - 成功時は sessionStorage に authenticated=true を保存
// ==========================================

import { PASSWORD_HASH } from './config.js';

const SESSION_KEY = 'authenticated';

export async function sha256Hex(text) {
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPassword(password) {
  if (!password) return false;
  const hash = await sha256Hex(password);
  // タイミング攻撃対策に厳密ではないが、共有パス用途として十分
  return hash === PASSWORD_HASH;
}

export function markAuthenticated() {
  sessionStorage.setItem(SESSION_KEY, 'true');
}

export function isAuthenticated() {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

export function clearAuth() {
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * 未認証ならルートにリダイレクトする。
 * app.html などの保護ページの先頭で呼ぶ。
 */
export function requireAuthOrRedirect(redirectTo = './index.html') {
  if (!isAuthenticated()) {
    location.replace(redirectTo);
    return false;
  }
  return true;
}
