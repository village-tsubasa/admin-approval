# admin-approval

利用者アプリ（user-schedule-app）から送信された予定申請を、**管理者が承認 / 却下**するための専用 Web アプリです。

移動中の管理者がスマートフォンからでも承認できるよう、レスポンシブ対応のカード型 UI で作られています。

---

## 主な機能

- 共有パスワードによるログイン（SHA-256 ハッシュ照合）
- 承認待ち（`approval_status='pending'`）申請の一覧表示（利用者別グループ化、申請日昇順）
- 個別 / 一括の承認・却下
- 重複検出: 同じ利用者・同じ日付に承認済みの予定があると ⚠️ 警告表示
- 承認時にスプレッドシートへ自動同期（GAS Web App 経由、指数バックオフリトライ付き）
- 却下時は理由を記録（スプレッドシートには送信しない）

---

## ファイル構成

```
admin-approval/
├── index.html              # パスワード入力画面
├── app.html                # 承認管理画面
├── css/
│   └── common.css          # 共通スタイル（色トークンを CSS 変数で集約）
├── lib/
│   ├── config.js           # ★ 設定集約（Supabase / GAS URL / パスワードハッシュ）
│   ├── auth.js             # SHA-256 検証 + sessionStorage 管理
│   ├── supabase-client.js  # Supabase クライアント初期化
│   ├── approval-api.js     # 一覧取得 / 承認 / 却下 / 重複検出
│   ├── gas-poster.js       # GAS POST（指数バックオフリトライ）
│   └── ui-utils.js         # トースト / エラー日本語化 / ローディング
├── tools/
│   └── hash-password.html  # 本番パスワードのハッシュ生成補助ページ
└── README.md
```

---

## ローカルで動かす

ES Modules を使っているため、`file://` で直接開くと動きません。必ずローカルサーバー経由で開いてください。

```bash
cd ~/Desktop/admin-approval
python3 -m http.server 8000
```

ブラウザで以下を開きます。

```
http://localhost:8000/
```

開発用パスワードは **`admin1234`** です（本番では必ず変更してください → [本番パスワードの設定](#本番パスワードの設定)）。

---

## 設定項目（lib/config.js）

`lib/config.js` に環境ごとの設定をすべて集約しています。デプロイ前にここを確認・編集してください。

| 定数 | 説明 |
|------|------|
| `SUPABASE_URL` | Supabase プロジェクト URL |
| `SUPABASE_ANON_KEY` | Supabase anon（公開）キー。クライアント公開前提のキーなので Git 管理して問題ありません |
| `GAS_WEB_APP_URL` | スプレッドシート同期用 GAS Web App の URL |
| `PASSWORD_HASH` | 共有パスワードの SHA-256 ハッシュ（後述） |
| `APPROVED_BY` | 承認者として記録する固定文字列（現在は `'管理者'`。個人特定は Phase 2 対応予定） |

> **anon key について:** Supabase の anon key はブラウザに配布される前提の公開キーです。RLS（Row Level Security）でアクセス制御するための鍵であり、これ自体が漏れても直ちに問題にはなりません。本リポジトリは public ですが anon key を含めて問題ありません。

---

## 本番パスワードの設定

ログインパスワードは平文では保存せず、**SHA-256 ハッシュ**として `lib/config.js` の `PASSWORD_HASH` に格納します（SHA-256 は不可逆なため、ハッシュが公開されても元のパスワードは復元できません）。

### 方法 1: ブラウザで生成（おすすめ）

1. ローカルサーバーを起動し、`http://localhost:8000/tools/hash-password.html` を開く
2. 本番パスワードを入力して「ハッシュを生成」
3. 表示された 64 文字をコピー
4. `lib/config.js` の `PASSWORD_HASH` の値（シングルクォート内）に貼り付け

### 方法 2: コマンドラインで生成

macOS / Linux:

```bash
echo -n "ここに本番パスワード" | shasum -a 256
```

Node.js:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('ここに本番パスワード').digest('hex'))"
```

Python:

```bash
python3 -c "import hashlib;print(hashlib.sha256('ここに本番パスワード'.encode()).hexdigest())"
```

### 反映

`lib/config.js` を編集後、Git にコミットして GitHub Pages に push すれば反映されます。

```js
// lib/config.js
export const PASSWORD_HASH = '生成した64文字のハッシュ';
```

---

## GitHub Pages へのデプロイ

本リポジトリは public のため、PR フローを使わず **main ブランチへ直接 push** で運用します。

### 1. 変更を main に push

```bash
cd ~/Desktop/admin-approval
git add .
git commit -m "コミットメッセージ"
git push origin main
```

### 2. GitHub Pages を有効化（初回のみ）

1. GitHub のリポジトリページ → **Settings** タブ
2. 左メニューの **Pages**
3. **Source** を `Deploy from a branch` に設定
4. **Branch** を `main` / `/ (root)` に設定して **Save**

### 3. デプロイ確認

数十秒〜数分後、以下の URL で公開されます。

```
https://tsubasa-okuhara.github.io/admin-approval/
```

以降は main に push するたびに自動で再デプロイされます。

---

## トラブルシューティング

### ログインできない / `app.html` に進めない
- `lib/config.js` の `PASSWORD_HASH` が正しいか確認（入力パスワードの SHA-256 と一致している必要があります）
- ブラウザのキャッシュをクリア、またはスーパーリロード（Cmd+Shift+R）

### 「@supabase/supabase-js が読み込まれていません」エラー
- `app.html` の `<head>` 内で `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>` が読み込まれているか確認
- ネットワーク（CDN）に接続できているか確認

### 承認待ち一覧が空になる
- Supabase の `schedule` テーブルに `approval_status='pending'` のレコードがあるか確認
- DevTools のコンソールにエラーが出ていないか確認（認証エラー・RLS など）

### 承認したのにスプレッドシートに反映されない（GAS POST 失敗）
- GAS POST は `mode: 'no-cors'` で送信するため、クライアント側では HTTP ステータスを確認できません
- ネットワーク例外時は指数バックオフ（1s → 2s → 4s、最大3リトライ）で自動再送します
- それでも失敗した場合、承認自体は確定（`approval_status='approved'`）したうえで `synced_to_sheet=false` を立て、**Layer B 後追い同期**に処理を委ねます
- 一覧上は「N件を承認しました（うち M 件はスプレッドシート同期に失敗、自動再送に委ねます）」と表示されます

### CORS エラーが出る
- `file://` で直接開いていないか確認（必ずローカルサーバー経由で開く）
- GAS への POST は `no-cors` 固定のため、GAS 側のレスポンスは読めません（これは仕様です）

### 認証エラー（JWT / Unauthorized）
- `lib/config.js` の `SUPABASE_ANON_KEY` が最新か確認（user-schedule-app と同じ値）

---

## 関連リソース

| リソース | URL / 場所 |
|----------|-----------|
| Supabase プロジェクト | https://pbqqqwwgswniuomjlhsh.supabase.co |
| Notion 設計書 | https://www.notion.so/35cfee123549812e9cf7fceda8eabddb |
| 利用者アプリ（申請の送信側） | `~/Desktop/user-schedule-app` |
| 公開 URL（デプロイ後） | https://tsubasa-okuhara.github.io/admin-approval/ |

---

## DB スキーマ補足（schedule テーブル）

承認ワークフローで使用する主なカラム:

| カラム | 型 | 説明 |
|--------|-----|------|
| `approval_status` | TEXT | `'pending'` / `'approved'` / `'rejected'`（デフォルト `'approved'`） |
| `approved_at` | TIMESTAMPTZ | 承認日時 |
| `approved_by` | TEXT | 承認者（現在は固定で `'管理者'`） |
| `rejected_reason` | TEXT | 却下理由 |
| `synced_to_sheet` | BOOLEAN | スプレッドシート同期済みフラグ（GAS POST 失敗時に `false`） |

インデックス: `idx_schedule_approval_status_pending`（partial index, `WHERE approval_status = 'pending'`）
