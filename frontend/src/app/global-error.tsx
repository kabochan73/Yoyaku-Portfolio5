"use client";

// ルートレイアウトごと落ちたときの画面。globals.css もフォントも届かないので、見た目はここに直接書く
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 16,
          fontFamily: "sans-serif",
          color: "#18181b",
          background: "#fafafa",
          textAlign: "center",
        }}
      >
        <title>エラー｜FUTSAL PARK</title>
        <h1 style={{ fontSize: 20, margin: 0 }}>
          ページを表示できませんでした
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: 6,
              background: "#16a34a",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            再読み込み
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- ルートレイアウトが壊れているので、Link で移らずページを丸ごと読み直す */}
          <a
            href="/"
            style={{
              padding: "8px 16px",
              border: "1px solid #d4d4d8",
              borderRadius: 6,
              color: "#18181b",
              textDecoration: "none",
            }}
          >
            トップページへ戻る
          </a>
        </div>
      </body>
    </html>
  );
}
