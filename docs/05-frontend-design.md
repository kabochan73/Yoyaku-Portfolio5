# 05. フロントエンド設計（Next.js）

Next.js 16 は API や規約に破壊的変更がある。実装のときは `node_modules/next/dist/docs/` を確認する。

## 方針

1. 機能ごとにまとめる（`features/*`）
2. サーバーの状態は TanStack Query に任せる。送信中・エラーを `useState` で持たない
3. API を呼ぶのは各機能の `logic/api.ts`（ブラウザ）と `logic/server.ts`（サーバー）だけ。コンポーネントや hook に URL を書かない
4. ルールをコードに書かない。営業時間・利用時間などは `/api/facility` から受け取る
5. 日付は `"YYYY-MM-DD"` の文字列で扱う。`Date` の生成・計算は `lib/date.ts` に閉じ込める

## ディレクトリ構成

```
frontend/src/
├── app/
│   ├── layout.tsx                    <html>、Providers、Header
│   ├── providers.tsx                 QueryClient
│   ├── (site)/
│   │   ├── layout.tsx                Footer
│   │   ├── page.tsx                  トップ
│   │   └── mypage/
│   │       ├── layout.tsx            会員だけ
│   │       └── page.tsx
│   ├── (auth)/
│   │   ├── layout.tsx                ログイン済みなら移動
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── admin/
│   │   ├── layout.tsx                管理者だけ
│   │   └── page.tsx
│   ├── internal/revalidate/route.ts  バックエンドから呼ばれる再検証
│   ├── error.tsx
│   ├── global-error.tsx
│   └── not-found.tsx
├── features/
│   ├── auth/
│   │   ├── components/               LoginForm, RegisterForm, ProfileForm, UserProvider, RequireUser
│   │   └── logic/
│   │       ├── api.ts                login, register, logout, fetchCurrentUser, updateProfile
│   │       ├── server.ts             getCurrentUser()
│   │       ├── hooks.ts              useCurrentUser, useLogin, useRegister, useLogout, useUpdateProfile
│   │       ├── schemas.ts
│   │       └── types.ts
│   ├── facility/
│   │   ├── components/               Hero, FacilityInfo, RulesSection, FacilityProvider
│   │   └── logic/
│   │       ├── server.ts             getFacility()（'use cache'）
│   │       ├── api.ts                fetchFacility()
│   │       ├── hooks.ts              useFacility()
│   │       ├── price.ts              見積もり料金の計算
│   │       └── types.ts
│   ├── calendar/
│   │   ├── components/               CalendarGrid, SlotCell, WeekNavigator, SelectionHint
│   │   └── logic/
│   │       ├── server.ts             getCalendar()（SSR 用）
│   │       ├── api.ts                fetchCalendar(from, to)
│   │       ├── hooks.ts              useCalendar(weekStart)
│   │       ├── selection.ts          枠選択のロジック（純粋関数）
│   │       └── types.ts
│   ├── reservations/
│   │   ├── components/               BookingCalendar, ReservationConfirmDialog, MyReservationList,
│   │   │                             ReservationCard, CancelDialog, ReservationSummary
│   │   └── logic/                    api.ts, hooks.ts, types.ts
│   └── admin/
│       ├── calendar/
│       │   ├── components/           AdminCalendar, AdminReservationDialog, PhoneReservationDialog
│       │   └── logic/                api.ts, hooks.ts, schemas.ts, types.ts
│       ├── settings/
│       │   ├── components/           PriceForm, RegularHolidayForm
│       │   └── logic/                api.ts, hooks.ts, schemas.ts
│       ├── holidays/
│       │   ├── components/           HolidayManager, HolidayForm, HolidayList, HolidayConflictDialog
│       │   └── logic/                api.ts, hooks.ts, schemas.ts, types.ts
│       └── users/
│           ├── components/           UserSearch
│           └── logic/                api.ts, hooks.ts, types.ts
├── components/
│   ├── ui/                           Button, Dialog, Accordion, FormField, Skeleton, Alert, ErrorState
│   └── layout/                       Header, HeaderUserMenu, Footer
├── lib/
│   ├── api-client.ts                 axios + ApiError への変換
│   ├── api-error.ts
│   ├── server-fetch.ts               サーバーからバックエンドを呼ぶ
│   ├── query-keys.ts
│   ├── query-config.ts               定期取得の間隔など
│   ├── date.ts                       日付の計算
│   ├── format.ts                     表示用の書式
│   ├── form-errors.ts                422 を入力欄のエラーに反映する
│   ├── use-debounced-value.ts
│   └── env.ts                        環境変数の検証
└── test/                             src と同じ構成のテスト、MSW のハンドラ、テスト用 render
```

- 機能どうしの依存は `admin → reservations → calendar → facility / auth` の一方向。逆向きの import はしない
- `components/ui` は機能のコードを import しない。`components/layout` は import してよい（ヘッダーがログイン状態を使うため）
- 各機能は `components/`（.tsx）と `logic/`（.ts）の2つに分ける。`logic/` には API の呼び出し・hook・スキーマ・型・計算を置き、JSX を書かない

## API 呼び出し

### ブラウザからは同一オリジンの `/api` を呼ぶ

```
ブラウザ ──/api/*, /sanctum/*──▶ Next.js（rewrites）──▶ nginx ──▶ Laravel
         同一オリジン                    API_URL（内部の URL）
```

- ローカルも本番も rewrites で中継する。API が同じオリジンなので、CORS の設定が要らず、セッション Cookie もフロントのドメインに付く（サーバー側で `cookies()` を読んでバックエンドに転送できる）
- `rewrites()` はビルド時に評価されるので、`API_URL` をビルド時にも渡す
- `app/api/` にはルートを作らない。作ると rewrites より先に当たり、中継されなくなる

### `lib/api-client.ts`（ブラウザ用）

```ts
export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: "application/json" },
});
```

- 419（CSRF トークン切れ）を受けたら、`/sanctum/csrf-cookie` を取り直して1回だけ送り直す
- ログイン・会員登録の前に `getCsrfCookie()` を呼ぶ
- エラーはすべて `ApiError`（`status`・`message`・`code`・`fieldErrors`・`body`）に変える。形式どおりでないエラー（ネットワークエラーなど）は「通信に失敗しました。時間をおいて再度お試しください。」にする
- `import "client-only"` を付ける

### `lib/server-fetch.ts`（サーバー用）

- 届いた `Cookie` と `X-Forwarded-For` を引き継ぎ、`Referer` に `FRONTEND_URL` を付けて `API_URL` を呼ぶ。Sanctum は `Referer` が `SANCTUM_STATEFUL_DOMAINS` に含まれるときだけ Cookie のセッションを見る
- `import "server-only"` を付ける

### `features/*/logic/api.ts`

レスポンスに型を付けた関数だけを置く。

```ts
export async function createReservation(input: CreateReservationInput): Promise<Reservation> {
  const { data } = await api.post<{ data: Reservation }>("/reservations", input);
  return data.data;
}
```

### クエリキー

`lib/query-keys.ts` に集める。

```ts
export const queryKeys = {
  user: ["user"] as const,
  myReservations: ["user", "reservations"] as const,
  facility: ["facility"] as const,
  calendar: {
    all: ["calendar"] as const,
    week: (weekStart: string) => ["calendar", weekStart] as const,
  },
  admin: {
    calendar: {
      all: ["admin", "calendar"] as const,
      week: (weekStart: string) => ["admin", "calendar", weekStart] as const,
    },
    holidays: ["admin", "holidays"] as const,
    users: (search: string) => ["admin", "users", search] as const,
  },
};
```

## ページの描画（Cache Components）

`next.config.ts` で `cacheComponents: true` にする。ページは「ビルド時に作る静的な部分（静的シェル）」と「アクセスのたびに描画して流し込む部分」に分かれる。

| パス | 静的シェル | アクセスのたびに描画 |
|---|---|---|
| `/` | Header の枠・Hero・施設情報・利用規約・Footer・カレンダーの週送り・案内と表のスケルトン | 今週のカレンダー |
| `/login`, `/register` | 骨組み | ログイン済みかの確認 |
| `/mypage` | 骨組み | ログイン確認とページの中身 |
| `/admin` | 骨組み | ログイン確認とページの中身 |

ルール:

- `'use cache'` の付いたデータと、データを使わない部分は静的シェルに入る
- キャッシュしない `fetch`・`cookies()`・`headers()` を使う部品は、必ず `<Suspense>` の中に置く。外で使うとビルドエラーになる
- レイアウトの一番上で `cookies()` を `await` しない。`{children}` ごと静的シェルから外れてしまう

### トップ

```tsx
// app/(site)/page.tsx
export default async function Home() {
  const facility = await getFacility();
  return (
    <FacilityProvider facility={facility}>
      <Hero facility={facility} />
      <FacilityInfo facility={facility} />
      <Suspense fallback={<BookingCalendarPlaceholder rules={facility.rules} />}>
        <BookingCalendarSection />
      </Suspense>
      <RulesSection />
    </FacilityProvider>
  );
}

async function BookingCalendarSection() {
  const calendar = await getCalendar();
  return <BookingCalendar initialCalendar={calendar} />;
}
```

## 施設情報（静的シェル + オンデマンド再検証）

```ts
// features/facility/logic/server.ts
export async function getFacility(): Promise<Facility> {
  "use cache";
  cacheLife("max");
  cacheTag("facility");
  // apiBaseUrl() で /facility を取る
}
```

- `cacheLife("max")`: 30日ごとに作り直す（保険）。実際の更新はオンデマンド再検証で行う
- 再検証のときに API が落ちていたら、前回の値を出し続ける

### 再検証の受け口

```ts
// app/internal/revalidate/route.ts
export async function POST(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return Response.json({ message: "unauthorized" }, { status: 401 });
  }
  revalidateTag("facility", { expire: 0 });
  return Response.json({ revalidated: true });
}
```

- バックエンドが料金・定休日を変えた後に呼ぶ（[04](04-backend-design.md#イベントとリスナー)）
- `Authorization: Bearer {REVALIDATE_SECRET}` を `timingSafeEqual` で比べる
- `{ expire: 0 }`: 次のアクセスで必ず作り直す。`"max"` だと、変更直後の1人目に古い料金が見える
- パスは `/api` の外。`/api/*` はバックエンドへの rewrites に使っている

### ビルド時の API

施設情報は静的シェルに入るので、`next build` の中で `/api/facility` を呼ぶ。

| 場面 | 呼び先 |
|---|---|
| `next build`（`NEXT_PHASE === "phase-production-build"`） | `BUILD_API_URL`（ビルド環境から届く URL。本番はバックエンドの公開 URL、CI はスタブサーバー） |
| 実行時の再生成 | `API_URL`（内部の URL） |

- API に届かなければビルドを失敗させる。フォールバックの値は持たない（間違った料金のページを配るより、デプロイが止まって気づけるほうがよい）
- そのため、初回はバックエンドを先にデプロイする（[08](08-dev-and-deploy.md)）

### ブラウザ側

- クライアントの部品は `useFacility()` で施設情報を読む。トップでは `FacilityProvider` が静的シェルの値を `initialData` として渡す
- ブラウザでは取り直さない（`staleTime: Infinity`）。ブラウザからの `/api/facility` は Laravel と DB まで届くので、訪問者の数だけ DB アクセスが増えるのを避ける
- `FacilityProvider` の無いページ（管理画面）では、最初の1回だけ `/api/facility` を取る。管理画面は料金・定休日を編集するので、再検証（worker の非同期処理）を待つ静的シェルの値ではなく、DB の最新の値を使う。届くまでは、カレンダーとほぼ同じ高さのスケルトンを出す
- 料金・定休日の変更は、開いているタブにはリアルタイムで伝えない。予約の金額はサーバーが計算するので、見積もりが古くても保存される金額は正しい

## 週間カレンダー

### 最初の表示（SSR）

- `getCalendar()`（`features/calendar/logic/server.ts`）は、アクセスのたびに `serverFetch` で今週の `/calendar` を取る。キャッシュしない
- 今週の月曜は日本時間の今日から求める。`await connection()` の後で `todayInTokyo()` を呼ぶ（Cache Components では、リクエストより前に現在時刻を読めない）
- 取れたデータを `BookingCalendar` に `initialCalendar` として渡し、TanStack Query の `initialData` にする（`initialDataUpdatedAt` は取得した時刻）
- 取得に失敗したら `initialCalendar` を `null` にして渡し、ブラウザで取り直す。それも失敗したら `ErrorState` を出す

### 表示した後

- `useCalendar(weekStart)` → `GET /api/calendar?from=月曜&to=日曜`。1週間 = 1リクエスト
- 次の週を先読みする（`prefetchQuery`）
- 週送りの上限は `meta.bookable_until` を含む週まで。以降の「今日」は `meta.today` を使う

### 他の人の操作の反映（定期取得）

| データ | 取り直すタイミング |
|---|---|
| カレンダー（`/calendar`, `/admin/calendar`） | 表示している間60秒ごと（`refetchInterval`）+ タブに戻ったとき・週を切り替えたとき（前回から60秒以上たっていれば。`staleTime`）+ 自分の操作の成功時 |
| マイページの予約一覧 | タブに戻ったとき + 自分の操作の成功時 |
| ヘッダーのユーザー | 5分間は取り直さない。ログイン・プロフィール更新ではレスポンスで置き換える。ログアウトはページを読み直す（メモリ上のキャッシュがすべて消える） |
| 施設情報 | 取り直さない |

```ts
export function useCalendar(weekStart: string, initialCalendar?: Calendar) {
  return useQuery({
    queryKey: queryKeys.calendar.week(weekStart),
    queryFn: () => fetchCalendar(weekStart, addDays(weekStart, 6)),
    staleTime: CALENDAR_FRESH_MS,
    refetchInterval: CALENDAR_POLL_MS,
    placeholderData: keepPreviousData,
    ...initialDataFor(weekStart, initialCalendar),
  });
}
```

- 間隔は `lib/query-config.ts` に置く: `CALENDAR_POLL_MS = 60_000`、`CALENDAR_FRESH_MS = 60_000`
- タブが裏にあるときは定期取得しない（TanStack Query の既定）
- 取り直しは ETag で軽くなる。304 は TanStack Query からは普通の 200 に見える

### 枠選択のロジック

`features/calendar/logic/selection.ts` に純粋関数として置く。会員用 `BookingCalendar` と管理者用 `AdminCalendar` が同じ関数と `CalendarGrid` を使い、「選び終わったら何をするか」だけが違う。

```ts
type Selection =
  | { kind: "idle" }
  | { kind: "start"; date: string; hour: number }
  | { kind: "complete"; date: string; startHour: number; endHour: number };

export function selectSlot(current: Selection, clicked: { date: string; hour: number }, ...): Selection;
export function canBeEnd(current: Selection, target: { date: string; hour: number }, ...): boolean;
```

React に依存しないので、境界値（2時間ちょうど、4時間ちょうど、間に予約済みがある、日をまたぐ）を Jest で直接テストできる。

### 更新後に取り直すデータ

| 操作 | 無効化するキー |
|---|---|
| 予約・キャンセル（会員） | `calendar.all`, `myReservations` |
| 電話予約・キャンセル（管理者） | `admin.calendar.all`, `calendar.all` |
| 臨時休業日の登録・削除 | `admin.holidays`, `admin.calendar.all`, `calendar.all` |
| 料金・定休日の更新 | `facility`（レスポンスで置き換え）, `admin.calendar.all`, `calendar.all` |
| プロフィール更新 | `user`（レスポンスで置き換え） |
| `409 slot_taken` | `calendar.all`（管理画面では `admin.calendar.all`） |
| `409 reservation_not_cancellable` | `myReservations` |

## Server Component と Client Component

1. 既定は Server Component。`"use client"` は、状態・副作用・TanStack Query などの hook・イベントハンドラ・ブラウザの API・Context が必要な部品にだけ付ける
2. `"use client"` は境界の部品にだけ書く。Client Component から import された部品は自動で Client Component になる
3. どちらからも使える部品（props を表示するだけ）には何も書かない
4. Server Component から Client Component へ渡す props は JSON にできる値だけ。日付は文字列のまま渡す
5. ページ（`page.tsx`）とレイアウトには `"use client"` を書かない

| 部品 | 種類 |
|---|---|
| `app/layout.tsx`, `Header`, `Footer`, `Hero`, `FacilityInfo`, `RulesSection` | Server |
| 各 `page.tsx` と `layout.tsx` | Server |
| `providers.tsx`, `HeaderUserMenu`, `UserProvider`, `FacilityProvider` | Client |
| `BookingCalendar`, `AdminCalendar`, `MyReservationList`, 各フォーム, `UserSearch`, `HolidayManager` | Client |
| `Dialog`, `Accordion` | Client |
| `Button`, `Skeleton`, `Alert`, `FormField`, `ErrorState`, `ReservationSummary` | どちらでも |
| `error.tsx`, `global-error.tsx` | Client（Next.js の決まり） |

- マイページの予約一覧はサーバーで取らない。タブに戻ったとき・操作の後の取り直しはどのみちブラウザで行うので、取り方を1通りにそろえる

## 認証とページの保護

### ヘッダーのログイン表示

- `HeaderUserMenu` がブラウザで `useCurrentUser()`（`GET /api/user`）を呼ぶ。取得中は何も出さない（ヘッダーの高さは固定なので、後からボタンが出てもずれない）

### サーバー側での保護

ログイン確認は `cookies()` を読むので、レイアウトの一番上ではなく `<Suspense>` の中の部品で行う。

```tsx
// app/admin/layout.tsx
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RequireUser role="admin">{children}</RequireUser>
    </Suspense>
  );
}

// features/auth/components/RequireUser.tsx（Server Component）
export async function RequireUser({ role, children }: { role: Role; children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== role) redirect(user.role === "admin" ? "/admin" : "/");
  return <UserProvider initialUser={user}>{children}</UserProvider>;
}
```

| レイアウト | 判定 |
|---|---|
| `app/admin/layout.tsx` | 未ログイン → `/login`、会員 → `/` |
| `app/(site)/mypage/layout.tsx` | 未ログイン → `/login`、管理者 → `/admin` |
| `app/(auth)/layout.tsx` | ログイン済み → 管理者は `/admin`、会員は `/` |

- `getCurrentUser()`（`features/auth/logic/server.ts`）は `serverFetch("/user")` を呼ぶ。401 なら `null`。React の `cache()` で1リクエスト内の重複をまとめる
- `UserProvider` は、サーバーで取ったユーザーを TanStack Query に先に入れる。ヘッダーやページの `useCurrentUser()` は取り直さずに済む
- 静的シェルを送り始めた後の `redirect()` は、ブラウザ側での移動になる（スケルトンが一瞬見えてから移動する）
- レイアウトでの判定は画面の出し分けのためで、守りではない。守りは API 側の `auth:sanctum` と `can:admin`

### セッション切れ

QueryClient の `onError` で 401 を受けたら `queryKeys.user` を `null` にする。保護されたページにいたらログイン画面へ移動する。

## フォーム

- React Hook Form + Zod。スキーマは `features/*/logic/schemas.ts` に置き、型は `z.infer` で作る
- サーバーの 422 は `applyServerErrors(form.setError, apiError)` で入力欄のエラーに反映する。当てはまる欄が無いもの（`credentials` など）はフォームの上に出す

## UI 部品

| 部品 | 作り |
|---|---|
| `Dialog` | ネイティブの `<dialog>` + `showModal()`。開いたら最初の操作できる要素にフォーカス、閉じたら元の場所に戻す。送信中は閉じられない |
| `SlotCell` | セルの中に `<button>`。`aria-label` に日時と状態を入れ、選択中は `aria-pressed`。押せない枠は `disabled` |
| `Button` | `variant`（primary / secondary / danger）と `size` |
| `Accordion` | `<details>` / `<summary>` |
| `ErrorState` | エラー文 + 再読み込みボタン |

## 日付

- サーバーとのやりとりは `"YYYY-MM-DD"` と「時」の整数だけ
- 「今日」は端末のタイムゾーンではなく日本時間で求める（`todayInTokyo()`）
- `lib/date.ts` の関数は文字列を受け取り文字列を返す（`addDays`, `mondayOf`）
- 表示用の書式は `lib/format.ts`（`formatDateJa`, `formatWeekRange`, `formatHourRange`, `formatYen`）

## 環境変数

`lib/env.ts` で Zod を使って検証する。足りなければ起動時に落ちる。

| 変数 | 使う場所 |
|---|---|
| `API_URL` | rewrites の中継先・サーバーからの fetch（内部の URL。rewrites に焼き込むのでビルド時にも必要） |
| `BUILD_API_URL` | ビルド時に `/facility` を取る先（ビルド環境から届く URL） |
| `FRONTEND_URL` | `serverFetch` の `Referer` |
| `REVALIDATE_SECRET` | `/internal/revalidate` の認証 |

## コーディング規約

- TypeScript `strict: true`、`noUncheckedIndexedAccess: true`。`any` を使わない
- コメントは最小限。コードを読めば分かることは書かない。経緯や作業手順は書かない
- ESLint（`eslint-config-next`）+ Prettier（`prettier-plugin-tailwindcss`）
