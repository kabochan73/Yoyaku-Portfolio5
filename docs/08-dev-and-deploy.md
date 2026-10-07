# 08. ローカル開発・CI・デプロイ

## リポジトリ構成

```
Yoyaku-Portfolio3/
├── backend/                  Laravel
│   ├── Dockerfile            開発用と本番用（multi-stage）
│   └── ...
├── frontend/                 Next.js
│   ├── Dockerfile            開発用と本番用（multi-stage）
│   ├── scripts/build-stub-server.mjs
│   └── ...
├── docker/postgres/init.sql  テスト用 DB を作る
├── docs/
├── .github/workflows/ci.yml
├── .nvmrc                    24
├── docker-compose.yml
└── README.md
```

## ローカル環境（docker compose）

| サービス | ポート | 役割 |
|---|---|---|
| frontend | 3000 | Next.js（`next dev`） |
| backend | 8000 → 8080 | nginx + php-fpm（`serversideup/php:8.4-fpm-nginx`） |
| worker | − | backend と同じイメージで `php artisan queue:work database --tries=3` |
| scheduler | − | backend と同じイメージで `php artisan schedule:work`（`model:prune`） |
| postgres | 5432 | 開発用 DB `futsal_db` とテスト用 DB `futsal_test` |
| redis | 6379 | カレンダーのキャッシュ・回数制限 |
| mailpit | 8025 / 1025 | 送ったメールの確認 |

- ブラウザは `http://localhost:3000/api` を呼び、Next.js の rewrites が `API_URL=http://backend:8080/api` へ中継する（本番と同じ経路）
- backend の 8000 番は、curl で API を直接呼ぶための入口
- backend・worker・scheduler は同じイメージなので、`docker-compose.yml` の YAML アンカーで共通の設定をまとめる
- worker・scheduler は `restart: unless-stopped`（Mac のスリープから戻ったときに止まることがあるため）
- 秘密の値は `backend/.env`・`frontend/.env.local`（git 管理外）に置き、`docker-compose.yml` に書かない
- ローカルでもバックエンドからの再検証が届くよう、`FRONTEND_INTERNAL_URL=http://frontend:3000` にする。`next dev` ではキャッシュが効かないので、再検証の確認は `next build && next start` で行う
- 手元で Node.js を使うとき（`npm run lint` など）は、ルートで `nvm use` して Node 24 に切り替える

### 初回セットアップ

```sh
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
docker compose up -d --build
docker compose exec backend php artisan key:generate
docker compose exec backend php artisan migrate --seed
```

`README.md` にも同じ手順を書く。

### よく使うコマンド

| やること | コマンド |
|---|---|
| backend のテスト | `docker compose exec backend php artisan test` |
| backend の静的解析 | `docker compose exec backend ./vendor/bin/phpstan analyse` |
| backend の整形 | `docker compose exec backend ./vendor/bin/pint` |
| frontend のテスト | `docker compose exec frontend npm test` |
| frontend の型チェック | `docker compose exec frontend npm run typecheck` |
| frontend の lint・整形 | `docker compose exec frontend npm run lint` / `npm run format` |

## CI（GitHub Actions）

画面まで作り終えた後、本番デプロイの前に用意する。`push`（main）と `pull_request` で実行する。

| ジョブ | ステップ |
|---|---|
| backend | PHP 8.4 → `composer install` → Pint（`--test`）→ Larastan → Pest（PostgreSQL・Redis のサービスコンテナ） |
| frontend | Node.js 24 → `npm ci` → ESLint → Prettier（`--check`）→ `tsc --noEmit` → Jest → スタブサーバーを起動 → `next build`（`BUILD_API_URL` = スタブ）→ `/` が `◐`（Partial Prerender）になっているか確かめる |

### ビルド用のスタブサーバー

施設情報は静的シェルに入るので、`next build` の中で `/api/facility` を呼ぶ。CI にはバックエンドが無いので、固定の JSON を返す小さなサーバーを立てる。

- `frontend/scripts/build-stub-server.mjs`: `GET /api/facility` だけに答える Node の HTTP サーバー（依存パッケージなし）
- 返す JSON は MSW のテストと同じ `src/test/fixtures/facility.json`
- `next build` の出力で `/` が `◐` でなければ CI を失敗させる。うっかり静的シェルの部分で `cookies()` を読み、トップ全体がアクセスごとの描画になるのを防ぐ

## 本番（Railway）

### サービス

| サービス | 中身 | 公開 URL | 起動 |
|---|---|---|---|
| frontend | `frontend/Dockerfile` の本番ステージ（`output: "standalone"`） | あり（利用者の入口） | `node server.js` |
| backend | `backend/Dockerfile` の本番ステージ | あり（フロントのビルドが施設情報を取るため） | イメージの既定（nginx + php-fpm） |
| worker | backend と同じ | なし | `php artisan queue:work database --tries=3` |
| scheduler | backend と同じ | なし | `php artisan schedule:work` |
| postgres | Railway の PostgreSQL | なし | |
| redis | Railway の Redis | なし | |

- 1つの GitHub リポジトリから、サービスごとに Root Directory（`backend/` か `frontend/`）を指定してデプロイする
- main への push で自動デプロイする。CI が通ってからデプロイされるように設定する
- サービス同士は内部ネットワーク（`サービス名.railway.internal`）で通信する。ビルド中は内部ネットワークが使えない

### リクエストの流れ

```
利用者 ──https──▶ frontend（公開 URL）
                   ├─ ページ: Next.js が描画
                   └─ /api/*, /sanctum/*: rewrites ──http──▶ backend.railway.internal:8080
                   
backend ──http──▶ frontend.railway.internal:3000/internal/revalidate（施設情報の再検証）

frontend のビルド ──https──▶ backend の公開 URL /api/facility
```

### backend のイメージ

- 本番ステージで `composer install --no-dev --optimize-autoloader` を流し、コードをイメージに入れる
- 起動時に `php artisan optimize`（config・route・view・event のキャッシュ）を流す。serversideup の AUTORUN（`AUTORUN_ENABLED=true`）を使い、AUTORUN のマイグレーションと `storage:link` は止める
- `APP_LOCALE`・`DB_CONNECTION` などは、渡し忘れても動くよう `config/` の既定値をこのアプリの値（`ja`・`pgsql`）にしておく
- ヘルスチェックは Laravel 標準の `/up`
- マイグレーションと初期データは backend サービスの pre-deploy command で流す: `sh -c "php artisan migrate --force && php artisan db:seed --class=InitialDataSeeder --force"`（Railway はシェルを通さずに実行するので、`&&` を使うには `sh -c` で包む）。worker・scheduler では流さない
- `InitialDataSeeder` は、管理者・料金がすでにあれば何もしないので、毎回流しても管理画面で変えた料金を上書きしない
- Start Command は空のままにする（イメージの既定の起動処理で nginx と PHP-FPM が立ち上がる）。ここにマイグレーションを入れると、アプリが起動しない
- `btree_gist` 拡張はマイグレーションで有効にする

### frontend のイメージ

- `API_URL`・`BUILD_API_URL`・`FRONTEND_URL`・`REVALIDATE_SECRET` を Dockerfile の `ARG` で受け取る（Railway の変数をビルド時に使うには `ARG` が必要。`next build` が `lib/env.ts` で4つとも確かめる）
- 実行用のイメージには、standalone の出力に加えて `public/` と `.next/static` をコピーする（`server.js` はこの2つを含まない）
- `API_URL` は rewrites に焼き込まれるのでビルド時にも要る。ビルド中は届かなくてよい
- `BUILD_API_URL` はビルド中に実際に呼ぶので、backend の公開 URL にする

### 初回デプロイの順番

frontend のビルドが backend の `/api/facility` を必要とするので、初回だけ順番に行う。

1. postgres・redis を作る
2. backend を作り、変数を入れてデプロイする（pre-deploy でマイグレーションと初期データ）
3. backend の公開 URL で `/api/facility` が返ることを確かめる
4. worker・scheduler を作ってデプロイする
5. frontend を作り、`BUILD_API_URL` に backend の公開 URL を入れてデプロイする
6. backend の `FRONTEND_URL`・`SANCTUM_STATEFUL_DOMAINS` などに frontend の公開 URL を入れて再デプロイする

2回目以降は同時にデプロイされてよい（動いている古い backend が同じ形の `/facility` を返すため）。`/facility` のレスポンスの形を変えるときだけ、backend を先にする。

### 環境変数

backend（worker・scheduler も同じ値を参照する）:

| 変数 | 内容 |
|---|---|
| `APP_ENV=production` / `APP_DEBUG=false` / `APP_KEY` | |
| `APP_URL` | backend の公開 URL |
| `FRONTEND_URL` | frontend の公開 URL（メールの中のリンク） |
| `SANCTUM_STATEFUL_DOMAINS` | frontend のホスト |
| `TRUSTED_PROXIES` | 内部ネットワークの範囲 |
| `FRONTEND_INTERNAL_URL` | `http://frontend.railway.internal:3000` |
| `FRONTEND_REVALIDATE_SECRET` | frontend の `REVALIDATE_SECRET` と同じ値 |
| `DB_URL` | postgres への参照変数 |
| `REDIS_URL` / `CACHE_STORE=redis` | |
| `QUEUE_CONNECTION=database` / `SESSION_DRIVER=database` | |
| `MAIL_MAILER=resend` / `RESEND_API_KEY` / `MAIL_FROM_ADDRESS` | |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | 管理者（シーダー用） |
| `FACILITY_PHONE` / `FACILITY_EMAIL` | 施設情報 |
| `LOG_CHANNEL=stderr` | Railway のログ画面で見る |
| `DEBUG_IP_ENDPOINT` | `GET /api/debug/ip` を確かめるときだけ一時的に `true` |

frontend:

| 変数 | 内容 |
|---|---|
| `API_URL` | `http://backend.railway.internal:8080/api`（ビルド時にも渡す） |
| `BUILD_API_URL` | backend の公開 URL + `/api`（ビルド時だけ使う） |
| `FRONTEND_URL` | frontend の公開 URL |
| `REVALIDATE_SECRET` | 推測されにくい値 |

### デプロイ後の手動確認

E2E テストを入れない代わりに、デプロイのたびに次を手で確かめる。

1. 会員登録 → トップで枠を選んで予約 → 完了メールが届く
2. トップを開き直すと、予約した枠が最初から「予約済」になっている（古い空き状況が出ない）
3. 別のブラウザで同じ週を開いておくと、再読み込みしなくても60秒以内に「予約済」に変わる
4. マイページでキャンセル → キャンセルメールが届く
5. 管理画面で料金を変える → トップを開き直すと新しい料金になっている（オンデマンド再検証）
6. 管理画面で予約のある日を臨時休業にする → 確認が出る → 承認すると予約が消え、施設都合のメールが届く
7. 管理画面で電話予約を登録・キャンセルできる
8. 会員で `/admin` を開くとトップへ、未ログインで `/mypage` を開くとログイン画面へ移動する
9. 今日の過ぎた時間の枠が「－」になっている。今日の開始済みの予約がマイページで「ご利用中 / ご利用済み」になっている
10. スマホ幅（375px）で、トップのカレンダー・ダイアログ・管理カレンダーが崩れない
11. Railway のログにエラーが出ていない
12. `DEBUG_IP_ENDPOINT=true` にして `GET /api/debug/ip` を開くと、自分の端末の IP が返る。確かめたら `false` に戻す

## 実装の順番

[00](00-overview.md#実装の順番) の各段階で作るもの。各段階は、テスト・静的解析・整形のチェックが手元で通ったら完了。

| 段階 | 作るもの |
|---|---|
| 1. 土台 | Laravel・Next.js のプロジェクト、docker compose、Dockerfile（開発用）、整形・静的解析・テストの設定 |
| 2. DB | マイグレーション、制約、モデルの最小限、Factory、シーダー |
| 3. 業務ロジック | `config/facility.php`、Enum、モデルのメソッド、`Domain/`（`Reservations/`・`Calendar/`・`Facility/`）、イベント・リスナー、メール |
| 4. API | ルート、FormRequest、Policy、Resource、Controller、エラー形式、回数制限、TrustProxies |
| 5. フロントの土台 | `lib/`、各機能の `logic/`、共通 UI 部品、レイアウト、Cache Components の設定、再検証の受け口 |
| 6. 画面 | トップ → ログイン・会員登録 → マイページ → 管理画面 |
| 7. CI | `.github/workflows/ci.yml`、ビルド用のスタブサーバー、`◐` の確認 |
| 8. 本番デプロイ | Dockerfile の本番ステージ、Railway のサービス、初回デプロイ、手動確認 |
