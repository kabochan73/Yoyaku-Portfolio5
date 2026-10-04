import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FUTSAL PARK｜屋内フットサルコートの予約",
    template: "%s｜FUTSAL PARK",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${notoSansJp.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-zinc-50 font-sans text-zinc-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
