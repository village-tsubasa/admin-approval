// ==========================================
// admin-approval 設定
// ==========================================
// このファイルは「環境ごとに書き換える 1 点」を集約しています。
// 通常デプロイ前にここを編集してください。
// ==========================================

// Supabase（user-schedule-app と共通の公開 anon key）
export const SUPABASE_URL = 'https://pbqqqwwgswniuomjlhsh.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBicXFxd3dnc3duaXVvbWpsaHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MTA3NTcsImV4cCI6MjA4OTI4Njc1N30.XgImGhrTc-cVHO9tvapCCz0y3XJZn3ma4vnd_QBYfDk';

// GAS Web App（スプレッドシート同期用）
export const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzWdv3KJpcJsG8LAj-aH_o-KEg0yCj1B5Q4v0MDzlV38jHbAM_GnHzjm2Lo0Wi3q75N/exec';

// ==========================================
// 共有パスワード（SHA-256 ハッシュ）
// ==========================================
// 本番パスワードの SHA-256 ハッシュ。パスワード本体は安全な場所に別途保管。
// ハッシュの生成方法は README.md「パスワード設定」または tools/hash-password.html を参照。
// ==========================================
export const PASSWORD_HASH = '576183cded768dad3b1538a90d025dbf3c902b007fe8d2b6383aed5bbb5cebff';

// 承認者表示名（Phase 2 で個人特定対応予定。現状は固定）
export const APPROVED_BY = '管理者';
