// ==========================================
// Supabase クライアント
// - @supabase/supabase-js (UMD) は HTML 側で <script> タグ経由で読み込み済み前提
//   例: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// ==========================================

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

if (!window.supabase || typeof window.supabase.createClient !== 'function') {
  throw new Error(
    '@supabase/supabase-js が読み込まれていません。HTML 側で次の <script> を lib/* インポートより前に挿入してください: ' +
    '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>'
  );
}

export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
