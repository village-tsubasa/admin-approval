// ==========================================
// GAS Web App への POST（指数バックオフリトライ付き）
// ==========================================
// 制約: schedule.html の syncToSheet と同様、mode: 'no-cors' を使う。
//       - opaque response のため、HTTP ステータスを読めない
//       - fetch が reject するのは「ネットワーク例外（オフライン、DNS、CORS preflight 拒否 等）」のみ
//       - GAS 側が 500 を返してもクライアントからは「成功」と見えるのが現実
// リトライ仕様:
//       - 初回 + 最大 3 回リトライ = 最大 4 回試行
//       - 遅延: 1s → 2s → 4s（前のリトライ前にのみ sleep）
//       - すべて失敗した場合は { ok: false } を返す（throw しない）
// 失敗後のフォールバックは呼び出し側で schedule.synced_to_sheet=false を立て、
// Layer B 後追い同期に処理を委ねる。
// ==========================================

import { GAS_WEB_APP_URL } from './config.js';

const RETRY_DELAYS_MS = [1000, 2000, 4000];

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * GAS にペイロードを POST する。失敗時は指数バックオフでリトライ。
 * @param {object} payload JSON シリアライズ可能なペイロード
 * @returns {Promise<{ok: boolean, attempts: number, error?: Error}>}
 */
export async function postToGasWithRetry(payload) {
  if (!GAS_WEB_APP_URL) {
    console.warn('GAS_WEB_APP_URL 未設定: スプレッドシート同期をスキップ');
    return { ok: true, attempts: 0, skipped: true };
  }

  const body = JSON.stringify(payload);
  let lastError = null;

  for (let attempt = 1; attempt <= 1 + RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 1) {
      const delay = RETRY_DELAYS_MS[attempt - 2];
      console.warn(`GAS POST リトライ ${attempt - 1}/${RETRY_DELAYS_MS.length}: ${delay}ms 後に再試行`, lastError);
      await sleep(delay);
    }

    try {
      await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        body
      });
      // no-cors では opaque response。fetch が解決した時点で「送信は完了」扱い。
      return { ok: true, attempts: attempt };
    } catch (ex) {
      lastError = ex;
      // ネットワーク例外 → 次のリトライへ
    }
  }

  console.error('GAS POST 最大リトライ回数到達。Layer B 後追い同期に委譲します。', lastError);
  return { ok: false, attempts: 1 + RETRY_DELAYS_MS.length, error: lastError };
}
