# 07. テスト方針

## 方針

- 層ごとに作るので、テストも層ごとに書く。1つの層は、その層のテストが手元で通ったら完了とする（CI は画面まで作った後に用意する）
- 予約ルールは境界値をテストする（1時間 / 2時間 / 4時間 / 5時間、9時開始 / 10時開始 / 20時開始 / 21時開始、1か月後の当日 / 翌日 など）
- 「今」に依存するテストは時刻を固定する（backend: `$this->travelTo()`、frontend: `jest.useFakeTimers().setSystemTime()`）
- 要件のルールを確かめるテストには、名前に要件の番号を入れる（例: `B7: 重なる時間帯は 409 slot_taken`）。[01](01-requirements.md) のどのルールがどのテストで守られているかを追えるようにする
- カバレッジの数値目標は置かない。下の「必ず書くテスト」を満たすことを完了の条件にする

## バックエンド（Pest）

### 実行環境

- PostgreSQL で実行する。排他制約・部分インデックス・`btree_gist` は SQLite に無く、二重予約の防止を確かめられない
- docker compose の `postgres` にテスト用の DB `futsal_test` を作る。CI は `services` で PostgreSQL と Redis を立てる
- キャッシュは Redis（テスト用の DB 番号）を使い、各テストの前に `Cache::flush()` する。本番と同じ保存・期限の動きを確かめるため
- `RefreshDatabase` を使う。`afterCommit` のリスナーも、テストの中の commit の後に動く
- テストデータは Factory の state で作る。`ReservationFactory` に `confirmed()` / `cancelled()` / `phone()` / `on($date, $start, $end)`

### フォルダ構成

実装の層と同じ順に並べる。

```
backend/tests/
├── Feature/
│   ├── Database/            2. DB: 制約・シーダー
│   ├── Reservations/        3. 業務ロジック: CreateReservation, CancelReservation
│   ├── Calendar/            3. 業務ロジック: CalendarQuery, CalendarCache, ForgetCalendarCache
│   ├── Facility/            3. 業務ロジック: CloseDay, ReopenDay, ClosedDays, 設定の更新
│   └── Api/                 4. API: エンドポイントごと、エラー形式、回数制限、IP
│       ├── Admin/
│       └── Auth/
└── Unit/
    └── Reservations/        3. 業務ロジック: TimeSlot, BookingRules（DB を使わない）
```

### 種類

| 種類 | 対象 | 例 |
|---|---|---|
| Unit | `TimeSlot`, `BookingRules`, `PriceTable`, `ClosedDays::reason` | 営業時間・利用時間の境界値、平日 / 土日の料金。`$now` を引数で渡すので DB も時刻の固定も要らない |
| Feature（DB） | マイグレーションの制約 | 重なる確定済みの予約を直接 INSERT すると `23P01`。キャンセル済みとは重なってよい |
| Feature（業務ロジック） | Action、`CalendarQuery`、`CalendarCache`、リスナー | DB の状態、発行されたイベント、キャッシュの中身 |
| Feature（API） | API 1本ずつ | ステータスコード、レスポンスの形、認可 |

### 必ず書くテスト

DB:

| 対象 | テスト |
|---|---|
| 二重予約（B7） | Action を通さず、同じ枠の確定済みの予約を2件 INSERT → 2件目が例外。キャンセル済みとは重なってよい |
| 1日1件（B8） | 同じ会員・同じ日の確定済みの予約を直接2件 INSERT → 2件目が例外。1件をキャンセル済みにすれば作れる。電話予約（`user_id` が NULL）は同じ日に何件でも作れる |
| CHECK 制約 | 開始 ≥ 終了、金額が負、状態と `cancelled_at` の食い違いが例外になる |
| 会員の削除 | 会員を削除しても予約は残り、`user_id` が NULL になる |
| シーダー | 2回流しても管理者・料金・定休日が増えない。管理者が変えた料金を初期値に戻さない |

業務ロジック:

| 対象 | テスト |
|---|---|
| 予約の作成 | 各ルール違反で `ValidationException` / 重なりで `slot_taken` / 同じ日の2件目で `already_booked_that_day` / 成功で料金が正しく、`ReservationCreated` が発行される |
| 電話予約 | 会員と同じルール違反（1か月より先・定休日も）で例外 / 同じ日に2件作れる |
| タイムゾーン | `travelTo('2026-10-06 08:00', 'Asia/Tokyo')`（UTC では前日）で、当日の枠が予約できる |
| 過ぎた時刻（B5） | 15:00 に当日の14時開始は例外、16時開始は作れる。開始時刻ちょうども例外 |
| 予約期間（B4） | `travelTo('2027-01-31')` で 2/28 は作れる・3/1 は例外。`bookableUntil` が 2027-02-28 |
| キャンセル（C2） | キャンセル済み・開始済みは `reservation_not_cancellable` |
| 臨時休業日 | 予約があって確認なし → `holiday_has_reservations` と件数 / 確認あり → 全件キャンセル・休業日の作成・メールがキューに積まれる / 途中で例外 → 予約も休業日も元のまま・メール0通 |
| 当日の臨時休業 | 14:00 に今日を休業日にする → 10〜12時の予約（開始済み）は残り、16〜18時の予約はキャンセル。確認の件数は1件 |
| メール | 会員の予約はメールあり・電話予約はなし。ロールバックしたらキューに積まれない |
| 日付のロック | `CreateReservation` と `CloseDay` の両方がロックを取る |
| カレンダー | 公開用は受付外の日が `slots: []` / 管理者用は定休日に残った予約の枠が `booked`、ほかが `closed` |
| カレンダーのキャッシュ | 2回目は DB への問い合わせが0回（`DB::enableQueryLog()`）/ 予約・キャンセル・休業日の登録と削除の後、その日のキャッシュだけが消える / 定休日の変更で定休日のキャッシュが消える / 61秒たつと DB から読み直す / `slot_taken` で失敗したらその日のキャッシュが消える |
| 時間の判定はキャッシュしない | キャッシュが残っていても、1時間進めると過ぎた枠が `past` になる |
| 予約時はキャッシュを使わない | キャッシュに「休業日ではない」が残っている状態で DB に休業日を入れる → 予約は例外になる |
| フロントの再検証 | 料金・定休日の更新で `RevalidateFrontendCache` がキューに積まれる。`Http::fake()` で正しい URL・Bearer トークンで呼ばれる。予約では呼ばれない |
| 予約の段階 | `phase` が開始前 / 利用中 / 終了で変わる。`isCancellable` は確定済みで開始前だけ真 |
| 保持期間 | `model:prune` で3か月より前の予約だけが消える |

API:

| 対象 | テスト |
|---|---|
| 予約 | 201 とレスポンスの形 / 422 の `errors` の項目 / 409 の `code` |
| キャンセル（C1） | 本人は 200 / 他人は 403 / 管理者でも会員用ルートでは他人の予約は 403 / 管理者用ルートでは他人の予約をキャンセルでき、理由が「管理者によるキャンセル」になる |
| 認可 | 管理者 API は会員で 403、未ログインで 401 |
| エラー形式 | 401 / 403 / 404 / 409 / 419 / 422 / 429 が `message` と `code` を持つ |
| カレンダーの ETag | `ETag` が付く / 同じ `If-None-Match` で 304 / 予約が入った後は 200 / `Cache-Control` に `private` と `no-cache` |
| 施設情報 | `/facility` の `rules` が `config/facility.php` と一致する |
| 会員登録 | `role: "admin"` を送っても `user` で作られる |
| プロフィール | 現在のパスワードが違う → 422 で `errors.current_password` |
| ログイン | 失敗 → 422 で `errors.credentials` |
| 回数制限 | ログインを6回/分 → 429 / `GET /calendar` は同じ IP から61回/分でも通る |
| 利用者の IP | 内部ネットワークから来た `X-Forwarded-For` は `ip()` に反映される。外から来たものは無視される |
| 会員検索 | `%` を含む検索語がワイルドカードとして扱われない / 最大20件 |

### 同時実行について

PHP のテストで本当に並行リクエストを出すのは難しいので、制約が効いていることを DB レベルで直接確かめる（上の「二重予約」「1日1件」）。アプリのチェックをすり抜けても DB が止めることを示せる。臨時休業日と予約の競合は、ロックを取る処理が両方の Action から呼ばれていることだけを確かめる。

## フロントエンド（Jest + Testing Library + MSW）

### 方針

- MSW でネットワークをモックし、`logic/api.ts` → hook → コンポーネントを通しでテストする
- 要素はクラス名ではなく、ロールとラベルで取る（`getByRole("button", { name: /10月6日.*12:00〜13:00 空き/ })`）
- テストは `src/test/` に、`src` と同じフォルダ構成で置く（例: `src/features/calendar/logic/selection.ts` → `src/test/features/calendar/logic/selection.test.ts`）
- MSW が返す JSON は `src/test/fixtures/` に置き、CI のビルド用スタブサーバーと共有する
- テストは日本以外のタイムゾーン（`TZ=America/Los_Angeles`）で動かす。日付の計算が端末のタイムゾーンに引きずられていないかを、すべてのテストで確かめるため

### Cache Components の部分

`'use cache'`・`connection()`・静的シェルの分かれ方は Jest では再現できないので、次で確かめる。

- `getFacility()`・`getCalendar()`・`getCurrentUser()` は、MSW で API の応答を変えて戻り値とエラーを確かめる
- トップが「静的シェル + 流し込み」（ビルド出力で `◐ Partial Prerender`）になっていることを、ビルドの出力で確かめる。CI ができるまでは手元の `next build` で、CI ができた後は CI で確かめる（[08](08-dev-and-deploy.md)）
- 施設情報の再検証は、デプロイ後の手動確認で確かめる

### 必ず書くテスト

| 対象 | テスト |
|---|---|
| `calendar/logic/selection.ts` | 開始の選択 / 2〜4枠目が終了候補 / 1枠目・5枠目は候補外 / 間に予約済みがあると候補外 / 別の日を押すと開始し直し / 予約済みを押すと解除 / 同じ枠をもう一度押すと解除 / 21時開始は候補なし |
| `lib/date.ts` | `todayInTokyo()` が端末のタイムゾーンに関係なく JST の日付を返す / 月・年をまたぐ `addDays` / `mondayOf` |
| `lib/api-client.ts` | 各ステータスが `ApiError` の `code` と `fieldErrors` に変わる / ネットワークエラーの文言 / 419 で CSRF Cookie を取り直して1回だけ送り直す（2回目の 419 はエラー） |
| `lib/format.ts` | `formatDateJa`（曜日）/ `formatHourRange` / `formatYen` |
| `BookingCalendar` の初期表示 | `initialCalendar` を渡すと、表示時に `/calendar` を呼ばない / `null` を渡すとブラウザで取る / それも 500 なら「空き状況を取得できませんでした」と再読み込みボタンが出て、「－」の枠は出ない |
| `BookingCalendar` の予約 | 枠を2回選ぶと確認ダイアログに日付・時間・料金が出る / 予約するとカレンダーが取り直される / `409 slot_taken` でエラー表示とカレンダーの取り直し |
| 定期取得 | 60秒進めると取り直す / タブが裏にある間は取り直さない / 30秒後に別の週へ行って戻ってもリクエストが出ない / 70秒後に戻ると取り直す / 予約の後は60秒以内でもすぐ取り直す |
| 選択中にデータが変わる | 開始に選んだ枠が取り直しの後に `booked` になる → 終了候補が0件になり「続けて空いていません」の案内が出る |
| `ReservationCard` | `phase` に応じて「キャンセル」ボタン /「ご利用中」/「ご利用済み」が出る |
| `CancelDialog` / `AdminReservationDialog` | キャンセルが 409 → ダイアログが開いたままエラーが出る |
| `PriceForm` / `RegularHolidayForm` | `/facility` の応答前は保存ボタンが無い。応答後に今の値が入る |
| `HeaderUserMenu` | 取得中はボタンと同じ大きさのスケルトン / 取得後にゲスト・会員・管理者のボタンに変わる |
| `/internal/revalidate` | 合言葉なし・違う値は 401 / 正しい値で `revalidateTag("facility", { expire: 0 })` が呼ばれる |
| `Dialog` | 開いたらフォーカスが中に移る / Esc で閉じる / 閉じたらフォーカスが戻る / 送信中は閉じない |
| フォーム | Zod のエラー表示 / サーバーの 422 が項目ごとに出る / `credentials` はフォームの上に出る |

### E2E

入れない。デプロイ後の手動確認の手順は [08](08-dev-and-deploy.md) に書く。
