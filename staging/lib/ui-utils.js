// ==========================================
// UI ユーティリティ
// - toast / humanizeError / showLoading
// ==========================================

let toastContainer = null;

function ensureToastContainer() {
  if (toastContainer && document.body.contains(toastContainer)) return toastContainer;
  let el = document.getElementById('toastContainer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toastContainer';
    el.className = 'toast-container';
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  toastContainer = el;
  return el;
}

/**
 * トースト通知を表示する。
 * @param {string} message
 * @param {'ok'|'warn'|'error'|''} kind 種別
 * @param {number} durationMs 表示時間（ms）。デフォルト 2800
 */
export function toast(message, kind = '', durationMs = 2800) {
  const container = ensureToastContainer();
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = message;
  container.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 250);
  }, durationMs);
}

/**
 * エラーオブジェクトを「ユーザー向け」日本語メッセージに変換する。
 * @param {unknown} error
 * @returns {string}
 */
export function humanizeError(error) {
  if (!error) return '不明なエラーが発生しました。時間をおいて再度お試しください。';
  const raw = (error && (error.message || error.error_description || error.msg)) || String(error);
  const msg = String(raw).toLowerCase();

  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed')) {
    return 'ネットワークに接続できませんでした。通信状態を確認して再度お試しください。';
  }
  if (msg.includes('timeout')) {
    return '通信がタイムアウトしました。時間をおいて再度お試しください。';
  }
  if (msg.includes('jwt') || msg.includes('invalid api key') || msg.includes('unauthorized')) {
    return '認証エラーが発生しました。再ログインしてください。';
  }
  if (msg.includes('permission') || msg.includes('forbidden') || msg.includes('rls')) {
    return 'この操作を行う権限がありません。管理者にお問い合わせください。';
  }
  if (msg.includes('not found') || msg.includes('does not exist')) {
    return '対象データが見つかりませんでした。一覧を更新してください。';
  }
  if (msg.includes('duplicate') || msg.includes('unique constraint')) {
    return '同じデータが既に登録されています。';
  }
  // 既知パターンに合致しない場合は短く表示
  return 'エラーが発生しました: ' + raw;
}

/**
 * 全画面ローディングオーバーレイの表示/非表示。
 * #loading 要素（class="loading-overlay"）が存在する前提。
 * @param {boolean} show
 */
export function showLoading(show) {
  const el = document.getElementById('loading');
  if (!el) return;
  el.classList.toggle('show', !!show);
}
