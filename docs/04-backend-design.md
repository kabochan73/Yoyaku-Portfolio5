# 04. バックエンド設計（Laravel）

## 方針

1. Controller は「受け取って、Action に渡して、Resource で返す」だけにする
2. 業務ロジックは `Domain/` の下の機能ごとのフォルダ（`Reservations/`・`Calendar/`・`Facility/`）に置く。ルール・処理・Enum・イベントを同じフォルダにまとめ、「その機能のコードはどこか」が1か所で済むようにする
3. Laravel が場所を決めているもの（`Http`・`Models`・`Policies`・`Mail`・`Providers`）は標準の場所に置く。`app/` の直下を見れば、「`Domain/` が業務ロジック、それ以外は Laravel の決まったフォルダ」と分かるようにする
4. 守らなければいけないルールは、DB 制約 → Action → FormRequest の順に強い場所で守る。画面の制限は使いやすさのためで、守りには数えない
5. 抽象化は「2か所以上で使う」か「テストで差し替える」ときだけ。Repository 層やインターフェースは作らず、Eloquent をそのまま使う

## ディレクトリ構成

```
backend/app/
├── Http/
│   ├── Controllers/
│   │   ├── Admin/       CalendarController, ReservationController, SettingsController,
│   │   │                HolidayController, UserController
│   │   ├── Auth/        RegisterController, SessionController
│   │   ├── CalendarController.php
│   │   ├── FacilityController.php
│   │   ├── ReservationController.php
│   │   └── UserController.php
│   ├── Requests/
│   │   ├── Admin/       StorePhoneReservationRequest, UpdatePricesRequest,
│   │   │                UpdateRegularHolidaysRequest, StoreHolidayRequest, SearchUsersRequest
│   │   ├── Auth/        RegisterRequest, LoginRequest
│   │   ├── CalendarRequest.php
│   │   ├── StoreReservationRequest.php
│   │   └── UpdateProfileRequest.php
│   ├── Resources/
│   │   ├── Admin/       CalendarDayResource, ReservationResource, UserResource
│   │   ├── CalendarDayResource.php
│   │   ├── FacilityResource.php
│   │   ├── HolidayResource.php
│   │   ├── ReservationResource.php
│   │   └── UserResource.php
│   └── ApiExceptionRenderer.php      例外を API のエラー形式の JSON にする
├── Models/              User, Reservation, Price, RegularHoliday, Holiday
├── Policies/            ReservationPolicy
├── Mail/                ReservationConfirmedMail, ReservationCancelledMail
├── Providers/           AppServiceProvider
├── Enums/               UserRole
│
└── Domain/                              業務ロジック
    ├── ConflictException.php            今のデータの状態とぶつかった（409）
    │
    ├── Reservations/                    予約
    │   ├── CreateReservation.php        予約する（会員・電話）
    │   ├── CancelReservation.php        キャンセルする
    │   ├── BookingRules.php             DB を見ずに決まるルール（営業時間・長さ・期間・過ぎた時刻）
    │   ├── TimeSlot.php                 日付 + 開始の時 + 終了の時
    │   ├── ReservationStatus.php        confirmed / cancelled
    │   ├── ReservationPhase.php         before_start / in_use / finished
    │   ├── CancellationReason.php       by_member / by_admin / by_holiday
    │   ├── DayClosedReason.php          past / out_of_range / regular_holiday / holiday
    │   ├── Events/                      ReservationCreated, ReservationCancelled
    │   └── Listeners/                   SendReservationConfirmedMail, SendReservationCancelledMail
    │
    ├── Calendar/                        カレンダー
    │   ├── CalendarQuery.php            公開用・管理者用のカレンダーを組み立てる
    │   ├── CalendarCache.php            日ごとの事実を Redis 経由で読む・消す
    │   ├── DayFacts.php                 1日分の事実（予約・臨時休業日か）
    │   ├── CalendarDay.php              公開用の1日分
    │   ├── AdminCalendarDay.php         管理者用の1日分
    │   ├── CalendarSlot.php             1枠
    │   ├── SlotStatus.php               available / booked / past / closed
    │   └── Listeners/                   ForgetCalendarCache
    │
    └── Facility/                        施設の設定
        ├── UpdatePrices.php
        ├── UpdateRegularHolidays.php
        ├── CloseDay.php                 臨時休業日の登録（予約の一括キャンセルを含む）
        ├── ReopenDay.php                臨時休業日の削除
        ├── ClosedDays.php               定休日・臨時休業日の判定
        ├── PriceTable.php               平日・土日の単価と料金の計算
        ├── PriceType.php                weekday / weekend
        ├── Events/                      FacilityChanged, HolidayChanged
        └── Listeners/                   RevalidateFrontendCache
```

```
backend/
├── config/facility.php              施設情報と予約のルール
├── lang/ja/                         エラーメッセージ
└── resources/views/
    ├── components/mail/layout.blade.php
    └── mail/                        reservation-confirmed, reservation-cancelled,
                                     reservation-cancelled-by-holiday
```

### 置き場所のルール

| 役割 | 置き場所 |
|---|---|
| 入力の形式チェック（型・必須・形式） | `Http/Requests`（FormRequest） |
| 認可 | `Policies`、`Gate`、ルートの `can:` |
| レスポンスの形 | `Http/Resources` |
| 業務ルール・更新処理・参照の組み立て | `Domain/` の機能フォルダ |
| 機能に属する Enum・イベント・リスナー | その機能フォルダ |
| 業務ロジックが投げる例外 | `Domain/`（`ConflictException`） |
| 機能に属さない Enum | `Enums/`（`UserRole` だけ） |
| 予約ルールの値・施設情報 | `config/facility.php` |

- 管理者用のものは、Controllers・Requests・Resources のどれも `Admin/` フォルダに分ける。クラス名の先頭に `Admin` は付けない
- 機能をまたぐ参照はしてよい（例: `Facility/CloseDay` が `Reservations/CancelReservation` を使う）

### リスナーの自動登録

Laravel は標準では `app/Listeners` だけを探すので、`bootstrap/app.php` で機能フォルダの `Listeners/` を探すように指定する。`bootstrap/app.php` はアプリの準備が整う前に読まれるので、`app_path()` ではなく `__DIR__` からの相対パスで書く。

```php
->withEvents(discover: [__DIR__.'/../app/Domain/*/Listeners'])
```

## 設定: `config/facility.php`

予約ルールと施設情報を置く唯一の場所。

```php
return [
    'name' => 'FUTSAL PARK',
    'phone' => env('FACILITY_PHONE', '092-123-4567'),
    'email' => env('FACILITY_EMAIL', 'info@futsalpark.example.com'),
    'address' => '〒000-0000 福岡県福岡市中央区1-2-3',

    'rules' => [
        'open_hour' => 10,
        'close_hour' => 22,
        'min_hours' => 2,
        'max_hours' => 4,
        'booking_window_months' => 1,
        'admin_lookback_months' => 3,
    ],

    'calendar_cache_ttl' => 60,

    'admin' => [
        'email' => env('ADMIN_EMAIL'),
        'password' => env('ADMIN_PASSWORD'),
    ],
];
```

- `admin_lookback_months` は、管理カレンダーで遡れる範囲と予約の保持期間を兼ねる
- `BookingRules` はこの `rules` から作り、`AppServiceProvider` で singleton として登録する。テストでは値を変えたものを `new` で作れる
- 営業時間などを変えるときは、このファイルだけを直せばよい（DB の CHECK 制約には書いていない。[02](02-database-design.md)）

## タイムゾーン

- `config/app.php`: `'timezone' => 'Asia/Tokyo'`
- `config/database.php` の pgsql 接続: `'timezone' => 'Asia/Tokyo'`
- 「今」は必ず `now()` / `today()` で取る（テストで `$this->travelTo()` できるように）

## 予約できるかの判定

判定は「DB を見ずに決まるもの」と「DB を見るもの」で置き場所を分ける。

```php
// Domain/Reservations/TimeSlot.php
final readonly class TimeSlot
{
    public function __construct(
        public CarbonImmutable $date,
        public int $startHour,
        public int $endHour,
    ) {}

    public function hours(): int;
    public function startsAt(): CarbonImmutable;
    public function endsAt(): CarbonImmutable;
    public function isWeekend(): bool;
}

// Domain/Reservations/BookingRules.php — DB に触らない。config の値と「今」だけで判定する
final readonly class BookingRules
{
    // 営業時間・長さ・期間・過ぎた時刻を検査する。違反はまとめて ValidationException（422）
    public function assertValidSlot(TimeSlot $slot, CarbonImmutable $now): void;
    public function bookableUntil(CarbonImmutable $now): CarbonImmutable;
    public function dateClosedReason(CarbonImmutable $date, CarbonImmutable $now): ?DayClosedReason;
    public function isPastSlot(CarbonImmutable $date, int $hour, CarbonImmutable $now): bool;
}

// Domain/Facility/ClosedDays.php — 定休日・臨時休業日の判定
final class ClosedDays
{
    // ルールだけ（DB に触らない）。カレンダーはキャッシュから読んだ値を渡す
    public static function reason(CarbonImmutable $date, array $regularHolidays, bool $isHoliday): ?DayClosedReason;

    // 予約時用。キャッシュを使わず DB を見る
    public function reasonFor(CarbonImmutable $date): ?DayClosedReason;
}
```

- `BookingRules` は `$now` を引数で受け取るので、DB も時刻の固定も無しで Unit テストができる
- 定休日・臨時休業日の判定ルールは `ClosedDays::reason()` の1か所。予約時とカレンダーで同じルールを使うので、「カレンダーでは空いて見えるのに予約すると 422」が起きない
- 予約時の判定はキャッシュを使わない。キャッシュは表示のためだけ

| チェック | 会員 | 電話予約 | 方法 |
|---|---|---|---|
| 営業時間内・2〜4時間（B2, B3） | ○ | ○ | `BookingRules` |
| 1か月以内（B4） | ○ | ○ | `BookingRules` |
| 開始が今より後（B5） | ○ | ○ | `BookingRules` |
| 定休日・臨時休業日でない（B6） | ○ | ○ | `ClosedDays::reasonFor` |
| 他の予約と重ならない（B7） | ○ | ○ | DB の排他制約 |
| 1日1件（B8） | ○ | − | DB の部分ユニーク索引（電話予約は `user_id` が NULL なので対象外） |

### 予約期間（1か月後）

- 予約できる最終日 = `$now->startOfDay()->addMonthsNoOverflow(booking_window_months)`（その日を含む）
- 例: 10/6 → 11/6、1/31 → 2/28（うるう年は 2/29）
- フロントでは計算しない。カレンダー API の `meta.bookable_until` で渡す

## 予約の作成: `CreateReservation`

```php
final readonly class CreateReservation
{
    public function forMember(User $user, TimeSlot $slot): Reservation;
    public function forPhone(string $bookerName, TimeSlot $slot): Reservation;
}
```

会員と電話予約の違いは「予約者名をどこから取るか」と「`user_id` を入れるか」だけ。

```
DB::transaction:
  1. 日付のロックを取る（Reservation::lockDate）
  2. BookingRules で検査する
  3. ClosedDays で休みでないことを確かめる
  4. INSERT する。料金は Price::table()->priceFor($slot)
     - 23P01（reservations_no_overlap）→ 409 slot_taken
     - 23505（reservations_user_date_confirmed_unique）→ 409 already_booked_that_day
  5. ReservationCreated を発行する
```

- 重なりと1日1件は、事前に確かめずに INSERT して、DB の制約違反を捕まえる。どの制約かは例外メッセージの制約名で見分ける
- `slot_taken` で失敗したら、トランザクションの外でその日のカレンダーのキャッシュを消す。「空きに見えたのに埋まっていた」と分かった時点で古いキャッシュを捨てる

### 臨時休業日の登録との競合

「会員が予約する」と「管理者がその日を休業日にする」が同時に起きると、次の順で休業日に予約が残りうる。

1. 会員: 休業日でないことを確かめる
2. 管理者: 休業日を登録し、その日の予約（まだ無い）をキャンセルして commit
3. 会員: 予約を INSERT して commit → 休業日なのに予約がある

防ぐため、`CreateReservation` と `CloseDay` の両方で、トランザクションの最初に日付ごとのアドバイザリロックを取る。休業日のチェックはロックを取った後に行う。

```php
DB::statement('SELECT pg_advisory_xact_lock(?)', [crc32('reservation-date:'.$date->toDateString())]);
```

## 予約のキャンセル: `CancelReservation`

```
DB::transaction:
  1. 予約を lockForUpdate で読み直す
  2. 確定済みで開始前でなければ → 409 reservation_not_cancellable
  3. status = cancelled、cancelled_at = now
  4. ReservationCancelled(reservation, reason, note) を発行する
```

- 行ロックで、会員と管理者が同時にキャンセルしてもメールが2通にならない
- 認可は Action の外（Controller で `$this->authorize('cancel', $reservation)`）

## 臨時休業日の登録: `CloseDay`

```
DB::transaction:
  1. 日付のロックを取る
  2. その日の「確定済みで開始前」の予約を lockForUpdate で読む
  3. 予約があり、cancel_reservations = false → 409 holiday_has_reservations（件数つき）
  4. holidays に INSERT する（ユニーク違反 → 409 holiday_already_exists）
  5. 予約を1件ずつ CancelReservation（reason = by_holiday、note = 理由）
  6. HolidayChanged(date) を発行する
```

- 手順2で開始済みの予約を除く。含めると手順5の「開始前だけ」のチェックで例外になり、登録全体が失敗する。確認ダイアログの件数も、実際にキャンセルされる件数とずれる
- メールは commit の後にキューへ積まれる。途中で失敗したら1通も送られない
- 削除（`ReopenDay`）も `HolidayChanged(date)` を発行する

## 施設の設定

- `UpdatePrices`: 2行を1つのトランザクションで更新し、`FacilityChanged` を発行する
- `UpdateRegularHolidays`: 全件削除 → 選ばれた曜日を挿入、を1つのトランザクションで行い、`FacilityChanged` を発行する

## イベントとリスナー

| イベント | リスナー | 内容 | 実行 |
|---|---|---|---|
| `Reservations\Events\ReservationCreated` | `SendReservationConfirmedMail` | 会員の予約なら完了メール | キュー |
| | `ForgetCalendarCache` | その日のキャッシュを消す | 同期 |
| `Reservations\Events\ReservationCancelled` | `SendReservationCancelledMail` | 会員の予約なら、理由に応じてキャンセル / 施設都合キャンセルのメール | キュー |
| | `ForgetCalendarCache` | その日のキャッシュを消す | 同期 |
| `Facility\Events\HolidayChanged` | `ForgetCalendarCache` | その日のキャッシュを消す | 同期 |
| `Facility\Events\FacilityChanged` | `RevalidateFrontendCache` | フロントの施設情報を再検証させる | キュー |
| | `ForgetCalendarCache` | 定休日のキャッシュを消す | 同期 |

- キューに回すリスナーは `ShouldQueueAfterCommit`。commit の後にだけキューへ積むので、ロールバックしたらメールは送られない（`ShouldQueue` + `ShouldHandleEventsAfterCommit` ではロールバックしても送られてしまう）
- `ForgetCalendarCache` はキューに回さない（`ShouldHandleEventsAfterCommit` だけ）。commit の直後に同じリクエストの中で消すので、操作した本人がすぐ取り直すと新しいデータが返る
- `RevalidateFrontendCache` は `POST {FRONTEND_INTERNAL_URL}/internal/revalidate` を合言葉付き（`Authorization: Bearer`）で呼ぶ。タイムアウト5秒、失敗したらキューのリトライ（3回）

## キャッシュ: カレンダーの日ごとの事実を Redis に置く

カレンダーは画面を開いている人が60秒ごとに取り直すので、キャッシュが無いと DB アクセスが見ている人数に比例して増える。

| 項目 | 内容 |
|---|---|
| キー | `calendar:day:{Y-m-d}`（日ごと）、`calendar:regular_holidays`（定休日の一覧） |
| 中身 | その日の確定済みの予約（id・開始・終了・予約者名・`user_id`・料金）と、臨時休業日か（理由つき） |
| 入れないもの | 時間で変わる判定（過ぎた枠、期間外、`phase`、`is_cancellable`）。読むたびに今の時刻で計算する |
| 期限 | 60秒（`config('facility.calendar_cache_ttl')`） |
| 消すタイミング | その日の予約・キャンセル・臨時休業日の登録と削除。定休日を変えたら定休日のキー |
| 使わない場面 | 予約時の判定（必ず DB を見る） |

`CalendarCache` の読み方:

1. 期間の日付ぶんのキーを `Cache::many` でまとめて読む
2. 無かった日だけ DB から1回のクエリで読み、`Cache::putMany` で保存する
3. 定休日のキーも同じように読む

時間で変わる判定をキャッシュに入れないので、キャッシュが古くなる原因は「書き込み」だけになる。書き込みのときに消せば正しさを保てる。

承知しているずれ:

- 読み込みと書き込みが重なると、消した直後に古いデータが保存されることがある。期限（60秒）で直る。その間に予約しようとした人は `slot_taken` になり、そこでキャッシュも消える
- アプリを通さない DB の変更（シーダー、手作業の SQL、`model:prune`）はキャッシュを消さない。手作業で DB を触ったら `php artisan cache:clear` を流す

### Redis の用途

| 用途 | 設定 |
|---|---|
| キャッシュ（カレンダー） | `CACHE_STORE=redis` |
| 回数制限 | キャッシュと同じ置き場所 |
| キュー | `QUEUE_CONNECTION=database`（PostgreSQL） |
| セッション | `SESSION_DRIVER=database`（PostgreSQL） |

Redis が止まると回数制限が数えられず、API 全体が 500 になる。対策はせず、止まったら Railway で再起動する。

## カレンダーの組み立て: `CalendarQuery`

```php
final readonly class CalendarQuery
{
    /** @return list<CalendarDay> */
    public function forPublic(CarbonImmutable $from, CarbonImmutable $to, CarbonImmutable $now): array;

    /** @return list<AdminCalendarDay> */
    public function forAdmin(CarbonImmutable $from, CarbonImmutable $to, CarbonImmutable $now): array;
}
```

日ごとの `closed_reason` は、次の順に先に当たったものにする。

1. 今日より前 → `past`
2. 予約できる最終日より後 → `out_of_range`
3. 定休日 → `regular_holiday`
4. 臨時休業日 → `holiday`
5. どれでもない → `null`（受付中）

| | 受付中の日 | 受付外の日 |
|---|---|---|
| `forPublic` | 各枠を `booked` → `past`（過ぎた時間）→ `available` の順に判定 | `slots: []` |
| `forAdmin` | 同じ。`booked` の枠に `reservation_id`、日ごとに予約の一覧 | 予約がある枠は `booked`、ほかは `closed`。3か月より前の日は `slots: []` |

戻り値は小さな DTO（`CalendarDay`・`AdminCalendarDay`・`CalendarSlot`）にし、Resource で JSON にする。

## 認可

| 対象 | 方法 |
|---|---|
| 管理者 API | `Gate::define('admin', ...)` を定義し、ルートに `can:admin` を付ける |
| 会員のキャンセル | `ReservationPolicy::cancel`: 自分の予約だけ。管理者もこのルートでは他人の予約をキャンセルできない |
| 管理者のキャンセル | ルートの `can:admin`。全件可。理由は `by_admin` |

会員用と管理者用のルートでキャンセルの理由（メールの文面）が変わるので、会員用ルートを管理者に開けない。

## Controller の例

```php
final class ReservationController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return ReservationResource::collection(
            $request->user()->reservations()->upcoming()->get()
        );
    }

    public function store(StoreReservationRequest $request, CreateReservation $action): JsonResponse
    {
        $reservation = $action->forMember($request->user(), $request->timeSlot());

        return ReservationResource::make($reservation)->response()->setStatusCode(201);
    }

    public function cancel(Reservation $reservation, CancelReservation $action): ReservationResource
    {
        $this->authorize('cancel', $reservation);

        return ReservationResource::make($action->handle($reservation, CancellationReason::ByMember));
    }
}
```

## 例外とエラーレスポンス

`bootstrap/app.php` の `withExceptions` で、`api/*` のエラーを [03 のエラー形式](03-api.md#エラー形式) にそろえる（`Http/ApiExceptionRenderer`）。

| 例外 | ステータス / `code` |
|---|---|
| `ValidationException` | 422 / `validation_failed` |
| `ConflictException` | 409 / 例外が持つ `code` |
| `AuthenticationException` | 401 / `unauthenticated` |
| `AuthorizationException` / `AccessDeniedHttpException` | 403 / `forbidden` |
| `ModelNotFoundException` / `NotFoundHttpException` | 404 / `not_found` |
| `TokenMismatchException` | 419 / `csrf_token_mismatch` |
| `ThrottleRequestsException` | 429 / `too_many_requests` |
| その他 | 500 / `server_error`。`message` は「サーバーでエラーが発生しました」で固定し、中身はログにだけ出す |

- 予約ルールの違反は `ValidationException::withMessages(['start_hour' => '...'])` で投げ、入力エラーと同じ形で返す
- 現在のパスワードの確認は Laravel 標準の `current_password` ルールを使う

## モデル

- `Reservation`
  - casts: `status` → `ReservationStatus`、`date` → `immutable_date`、`cancelled_at` → `immutable_datetime`
  - scope: `confirmed()`、`between($from, $to)`、`upcoming()`
  - メソッド: `timeSlot()`、`phase($now)`、`isCancellable($now)`、`cancel($now)`、`lockDate($date)`（static）
  - `MassPrunable`。`prunable()` は「3か月より前」。スケジューラで `model:prune` を毎日実行する
- `Price`: `Price::table()` で2行を `PriceTable` にして返す。行が足りなければ例外
- `User`: casts で `role` → `UserRole`。`role` は fillable に含めない（会員登録 API から管理者を作れないように。シーダーでは `forceFill`）
- 一括代入は `#[Fillable]` 属性で許可リストを書く

## メール

- キューに積むのはリスナーだけ。Mailable に `ShouldQueue` を付けると、キューに2回積むことになる
- テンプレートは共通のレイアウト（`<x-mail.layout>`）を使う
- 件名とフッターの施設名・電話番号は `config('facility.*')` から取る

## コーディング規約

- 全ファイルに `declare(strict_types=1);`
- 継承されないクラスは `final`、値オブジェクト・DTO は `readonly`
- コメントは最小限。コードを読めば分かることは書かない。書くのは「なぜ」が自明でないところだけ。経緯や作業手順は書かない
- Pint（`laravel` プリセット）で整形する
- Larastan はレベル 6 から始め、完成までに 8 にする
- エラーメッセージは `lang/ja/` に置き、コードに日本語を直書きしない（`APP_LOCALE=ja`）
- ログは `LOG_CHANNEL=stderr`（Railway のログ画面で見る）
