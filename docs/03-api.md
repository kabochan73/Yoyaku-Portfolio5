# 03. API 仕様

- ベース URL: `/api`。ブラウザからは Next.js の rewrites を通して同一オリジンで呼ぶ（[05](05-frontend-design.md)）
- 認証: Laravel Sanctum の SPA Cookie 認証
  1. `GET /sanctum/csrf-cookie` で `XSRF-TOKEN` の Cookie を受け取る
  2. 以降のリクエストで `X-XSRF-TOKEN` ヘッダーを付ける（axios の `withXSRFToken`）
- リクエスト・レスポンスは JSON。キーは `snake_case`
- 日付は `YYYY-MM-DD`、時刻は「時」の整数、日時は ISO 8601（`+09:00` 付き）

## エンドポイント一覧

### 公開

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/facility` | 施設情報・予約のルール・料金・定休日 |
| GET | `/calendar?from=&to=` | 期間の空き状況（誰が呼んでも同じ内容） |

### 認証・ログイン中のユーザー

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/register` | 会員登録（登録後はログイン状態） |
| POST | `/login` | ログイン |
| POST | `/logout` | ログアウト |
| GET | `/user` | ログイン中のユーザー（未ログインは 401） |
| PUT | `/user/profile` | プロフィール更新 |

### 会員（`user` ロールのみ）

管理者が呼ぶと 403。管理者の予約は電話予約（`/admin/reservations`）から入れる。

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/user/reservations` | 自分の今日以降の確定済みの予約 |
| POST | `/reservations` | 予約する |
| POST | `/reservations/{reservation}/cancel` | 自分の予約をキャンセルする |

キャンセルは行を消さずに状態を変える操作なので、`DELETE` ではなく `POST .../cancel` にする。

### 管理者（`admin` ロールのみ）

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/admin/calendar?from=&to=` | 管理カレンダー（枠の状態 + 予約の詳細） |
| POST | `/admin/reservations` | 電話予約を登録する |
| POST | `/admin/reservations/{reservation}/cancel` | 予約をキャンセルする |
| PUT | `/admin/prices` | 料金を更新する |
| PUT | `/admin/regular-holidays` | 定休日を更新する |
| GET | `/admin/holidays` | 臨時休業日の一覧（今日以降） |
| POST | `/admin/holidays` | 臨時休業日を登録する |
| DELETE | `/admin/holidays/{holiday}` | 臨時休業日を削除する |
| GET | `/admin/users?search=` | 会員検索 |

## エラー形式

すべてのエラーを次の形にそろえる。

```json
{
  "message": "人が読むためのメッセージ（画面にそのまま出してよい）",
  "code": "画面の分岐に使うコード",
  "errors": { "field": ["項目ごとのメッセージ"] }
}
```

| ステータス | 場面 | `code` | `errors` |
|---|---|---|---|
| 401 | 未ログイン | `unauthenticated` | なし |
| 403 | 権限なし（他人の予約・管理者以外） | `forbidden` | なし |
| 404 | 対象が無い | `not_found` | なし |
| 409 | 今のデータの状態とぶつかった（下表） | 下表 | なし |
| 419 | CSRF トークン切れ | `csrf_token_mismatch` | なし |
| 422 | 入力値の誤り・予約ルール違反 | `validation_failed` | あり |
| 429 | 回数制限 | `too_many_requests` | なし |

場面ごとの追加情報を、この3つのキーの横に足してよい（例: `reservation_count`）。

### 409 の `code`

| `code` | 場面 |
|---|---|
| `slot_taken` | 予約しようとした時間帯がすでに埋まっている（排他制約 `reservations_no_overlap` の違反を含む） |
| `already_booked_that_day` | 同じ日に自分の予約がすでにある（ユニーク索引 `reservations_user_date_confirmed_unique` の違反を含む） |
| `reservation_not_cancellable` | キャンセル済み・開始済みの予約をキャンセルしようとした |
| `holiday_has_reservations` | 臨時休業日を登録しようとした日に予約がある（確認が必要） |
| `holiday_already_exists` | すでに登録されている休業日（ユニーク制約 `holidays_date_unique` の違反を含む） |

### 422 と 409 の使い分け

- 422: リクエストの値そのものが条件を満たしていない（2時間未満、営業時間外、定休日、予約期間外、過ぎた時刻）。同じリクエストは何度送っても失敗する
- 409: 値は正しいが、今のデータの状態とぶつかっている（他の予約、既存の休業日）。状況が変われば成功しうる

フロントは `409 slot_taken` を受けたらカレンダーを取り直す。

### 項目エラーにするもの

入力欄の下に出せるよう、次は `errors` の項目として返す。

| 場面 | 項目 |
|---|---|
| 予約の時刻が営業時間外・長さが範囲外・過ぎている | `start_hour` / `end_hour` |
| 予約日が期間外・定休日・臨時休業日 | `date` |
| プロフィール更新で現在のパスワードが違う | `current_password` |
| ログインの失敗 | `credentials` |

ログインの失敗は、メールアドレスとパスワードのどちらが違うかを教えないため、特定の入力欄ではない `credentials` に「メールアドレスまたはパスワードが正しくありません。」を入れる。フロントはフォームの上に出す。

## 各エンドポイント

### GET `/facility`

施設情報と、カレンダーの描画に必要なルールをまとめて返す。フロントは営業時間などをコードに書かず、ここから受け取る。

```json
{
  "data": {
    "name": "FUTSAL PARK",
    "phone": "092-123-4567",
    "address": "〒000-0000 福岡県福岡市中央区1-2-3",
    "email": "info@futsalpark.example.com",
    "rules": {
      "open_hour": 10,
      "close_hour": 22,
      "min_hours": 2,
      "max_hours": 4,
      "booking_window_months": 1
    },
    "prices": { "weekday": 4000, "weekend": 5000 },
    "regular_holidays": [1]
  }
}
```

### GET `/calendar?from=2026-10-05&to=2026-10-11`

| パラメータ | ルール |
|---|---|
| from, to | 必須、`Y-m-d`、`from <= to`、期間は最大14日 |

```json
{
  "meta": {
    "today": "2026-10-06",
    "bookable_until": "2026-11-06"
  },
  "data": [
    {
      "date": "2026-10-05",
      "closed_reason": "regular_holiday",
      "slots": []
    },
    {
      "date": "2026-10-06",
      "closed_reason": null,
      "slots": [
        { "hour": 10, "status": "past" },
        { "hour": 11, "status": "booked" },
        { "hour": 12, "status": "available" }
      ]
    }
  ]
}
```

- `meta.today` / `meta.bookable_until`: サーバー（JST）から見た今日と、予約できる最終日。フロントは週送りの範囲をこれで決め、自分で日付を計算しない
- `closed_reason`: `null` / `regular_holiday` / `holiday` / `out_of_range`（予約期間外）/ `past`（過去の日）
- 枠の `status`: `available` / `booked` / `past`（今日の過ぎた時間）
- 受付外の日は `slots: []`（予約の有無も見せない）
- 誰が呼んでも同じ内容を返す。管理者向けの情報は `/admin/calendar` に分ける

### ETag と 304

`GET /calendar` と `GET /admin/calendar` は ETag を付け、中身が前回と同じなら `304 Not Modified`（本文なし）を返す。

```php
Route::get('/calendar', ...)->middleware('cache.headers:private;no_cache;etag');
```

- `etag`: レスポンスの中身のハッシュを ETag にし、`If-None-Match` が一致すれば 304 を返す（Laravel 標準の `SetCacheHeaders`）
- `no_cache`: ブラウザは保存してよいが、使う前に毎回サーバーに確かめる。古い空き状況をそのまま使わせない
- `private`: 途中のキャッシュ（CDN など）には保存させない。`/admin/calendar` は予約者名を含むため
- 減るのは通信量だけ。中身の組み立ては毎回行う（DB アクセスは Redis で減らす。[04](04-backend-design.md)）
- 304 は axios・TanStack Query からは普通の 200 に見えるので、フロントのコードは変わらない

### GET `/admin/calendar?from=2026-10-05&to=2026-10-11`

管理カレンダー用。1週間分の枠の状態と予約の詳細を1回で返す。パラメータは `/calendar` と同じ。

```json
{
  "meta": { "today": "2026-10-06", "bookable_until": "2026-11-06", "oldest_date": "2026-07-06" },
  "data": [
    {
      "date": "2026-10-05",
      "closed_reason": "regular_holiday",
      "slots": [
        { "hour": 10, "status": "closed", "reservation_id": null },
        { "hour": 18, "status": "booked", "reservation_id": 41 },
        { "hour": 19, "status": "booked", "reservation_id": 41 }
      ],
      "reservations": [
        {
          "id": 41, "date": "2026-10-05", "start_hour": 18, "end_hour": 20, "hours": 2,
          "price": 8000, "status": "confirmed", "phase": "before_start", "is_cancellable": true,
          "booker_name": "山田太郎", "user_id": 5, "is_phone": false
        }
      ]
    }
  ]
}
```

- 枠の `status`: `/calendar` の3種類に加えて `closed`（受付外の日の、予約が無い枠）
- `booked` の枠は `reservation_id` を持つ。予約の中身は日ごとの `reservations` に1回だけ入れる（2〜4枠にまたがる予約を枠ごとに重複させない）
- 受付外の日も全12枠を返し、予約がある枠は `booked` にする。定休日に残った予約を確認・キャンセルできるようにするため
- `meta.oldest_date`: 遡って予約を見られる最初の日（今日の3か月前）。フロントは前の週への移動をこの日を含む週までにする
- 3か月より前の日は `slots: []`、`reservations: []`（予約の保持期間外）

### POST `/reservations`

```json
{ "date": "2026-10-06", "start_hour": 12, "end_hour": 14 }
```

- 成功: `201` + ReservationResource
- 失敗: 422（予約ルール違反）/ 409（`slot_taken`, `already_booked_that_day`）

### ReservationResource

```json
{
  "data": {
    "id": 1,
    "date": "2026-10-06",
    "start_hour": 12,
    "end_hour": 14,
    "hours": 2,
    "price": 8000,
    "status": "confirmed",
    "phase": "before_start",
    "is_cancellable": true,
    "booker_name": "山田太郎"
  }
}
```

- `phase`: 今の時刻から見た段階。`before_start`（開始前）/ `in_use`（利用中）/ `finished`（終了）。フロントは端末の時計と比べず、これを使う
- `is_cancellable`: `status = confirmed` かつ `phase = before_start`。キャンセルボタンを出すかに使う
- 時刻は「時」の整数だけを返す。`"12:00〜14:00"` のような表示用の文字列はフロントで作る
- 管理者向け（AdminReservationResource）は `user_id` と `is_phone`（電話予約か）を足す

### POST `/reservations/{reservation}/cancel`

- 本人の予約だけ（Policy）。他人の予約は 403
- 確定済みで開始前の予約だけ。それ以外は `409 reservation_not_cancellable`
- 成功: `200` + ReservationResource（`status: "cancelled"`）

### UserResource

`/user`・`/login`・`/register`・`/user/profile` が返す。

```json
{ "data": { "id": 1, "name": "山田太郎", "email": "taro@example.com", "role": "user" } }
```

### PUT `/user/profile`

```json
{
  "name": "山田太郎",
  "email": "taro@example.com",
  "current_password": "old-password",
  "password": "new-password",
  "password_confirmation": "new-password"
}
```

- `name`・`email` は必須
- `password` を送るときだけ `current_password` と `password_confirmation` が必須
- 成功: `200` + UserResource

### POST `/admin/reservations`

```json
{ "date": "2026-10-06", "start_hour": 12, "end_hour": 14, "booker_name": "佐藤（電話）" }
```

- `booker_name`: 必須、255文字以内
- 成功: `201` + AdminReservationResource
- 失敗: 422 / `409 slot_taken`

### POST `/admin/reservations/{reservation}/cancel`

誰の予約でもキャンセルできる。それ以外は会員のキャンセルと同じ。成功: `200` + AdminReservationResource

### PUT `/admin/prices`

```json
{ "weekday": 4000, "weekend": 5000 }
```

- 必須、0以上の整数
- 成功: `200` + `/facility` と同じ形（更新後の施設情報）

### PUT `/admin/regular-holidays`

```json
{ "days": [1, 3] }
```

- `days` は空配列を許す（定休日なし）。各値は 0〜6、重複不可
- 成功: `200` + `/facility` と同じ形

### GET `/admin/holidays`

今日以降の臨時休業日を日付の順に返す。

```json
{ "data": [{ "id": 3, "date": "2026-10-10", "reason": "設備点検" }] }
```

### POST `/admin/holidays`

```json
{ "date": "2026-10-10", "reason": "設備点検", "cancel_reservations": false }
```

- `date`: 必須、今日以降。`reason`: 任意、255文字以内
- その日に確定済みで開始前の予約があり、`cancel_reservations: false` のとき → `409 holiday_has_reservations`
  ```json
  {
    "message": "この日には2件の予約があります。すべてキャンセルして休業日にしますか？",
    "code": "holiday_has_reservations",
    "reservation_count": 2
  }
  ```
- 管理者が承認したら `cancel_reservations: true` で送り直す → 予約をすべてキャンセルして `201` + `{ "data": { "id": 3, "date": "2026-10-10", "reason": "設備点検" } }`

### DELETE `/admin/holidays/{holiday}`

成功: `204`（本文なし）

### GET `/admin/users?search=山田`

- `search`: 必須、1〜255文字
- 名前またはメールアドレスの部分一致。大文字と小文字を区別しない（PostgreSQL の `ilike`）。`%` と `_` はエスケープする
- 名前の順に最大20件

```json
{
  "data": [
    { "id": 5, "name": "山田太郎", "email": "taro@example.com", "confirmed_reservations_count": 3 }
  ],
  "meta": { "limit": 20 }
}
```

## 回数制限

| 対象 | 制限 |
|---|---|
| `POST /login`, `POST /register` | IP とメールアドレスの組ごとに 5回/分 |
| `GET /calendar`, `GET /admin/calendar` | ユーザー（未ログインは IP）ごとに 300回/分 |
| その他 | ユーザー（未ログインは IP）ごとに 60回/分 |

カレンダーだけ緩くするのは、画面を開いている間60秒ごとに取り直すため。学校や会社の Wi-Fi のように大勢が同じ IP を使っていると、未ログインの人の取得が1つの枠にまとめて数えられる。

### 利用者の IP の取り方

リクエストは「ブラウザ → Next.js → nginx → Laravel」と中継されるので、そのままでは `$request->ip()` が Next.js サーバーの IP になり、全員が1つの枠を分け合ってしまう。

- Laravel の `TrustProxies` で、内部ネットワーク（Docker / Railway のプライベートネットワーク）からの `X-Forwarded-For` だけを信用する
- 本番では Railway の入口が、利用者の IP を `X-Real-IP` に入れる。`X-Forwarded-For` の後ろには入口自身の IP（範囲は非公開）も足されるので、信頼するプロキシから来たときは `X-Real-IP` を優先する（`UseRealIpHeader` ミドルウェア）。`X-Real-IP` が無いとき（ローカル）は `X-Forwarded-For` を使う
- Next.js の rewrites は、届いたヘッダーをそのまま中継する
- Next.js のサーバー側からバックエンドを呼ぶとき（カレンダーの SSR など）は、届いた `X-Forwarded-For` と `X-Real-IP` を引き継いで送る
- デプロイ後の確認用に `GET /debug/ip`（`$request->ip()` を返す）を用意する。ローカル・テスト環境か、環境変数 `DEBUG_IP_ENDPOINT=true` のときだけ有効で、それ以外は 404
