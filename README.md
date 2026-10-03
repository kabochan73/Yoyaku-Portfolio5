# FUTSAL PARK

フットサルコート1面の予約サイト。利用者は空き状況を見て Web で予約し、管理者は予約の確認・電話予約の代理登録と、料金・定休日・臨時休業日の設定を行う。

## 技術スタック

| 層 | 技術 |
|---|---|
| フロントエンド | Next.js 16（App Router・Cache Components）/ React 19 / TypeScript / Tailwind CSS v4 / TanStack Query |
| バックエンド | Laravel 13 / PHP 8.4 / Sanctum |
| DB・キャッシュ | PostgreSQL 15 / Redis 7 |
| テスト | Pest / Jest + Testing Library + MSW |
| 本番 | Railway |

## 初回セットアップ

必要なもの: Docker、Node.js 24（`nvm use` で切り替え）

```sh
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
docker compose up -d --build
docker compose exec backend php artisan key:generate
docker compose exec backend php artisan migrate --seed
```

| URL | 中身 |
|---|---|
| http://localhost:3000 | サイト |
| http://localhost:8000 | API（直接呼ぶとき） |
| http://localhost:8025 | Mailpit（送ったメール） |

## よく使うコマンド

| やること | コマンド |
|---|---|
| backend のテスト | `docker compose exec backend ./vendor/bin/pest` |
| backend の静的解析 | `docker compose exec backend ./vendor/bin/phpstan analyse` |
| backend の整形 | `docker compose exec backend ./vendor/bin/pint` |
| frontend のテスト | `docker compose exec frontend npm test` |
| frontend の型チェック | `docker compose exec frontend npm run typecheck` |
| frontend の lint・整形 | `docker compose exec frontend npm run lint` / `npm run format` |

## 設計書

[docs/](docs/) に、要件・DB・API・バックエンド・フロントエンド・画面・テスト・デプロイの設計書がある。最初は [00-overview.md](docs/00-overview.md) から。
