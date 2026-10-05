import { Footer } from "@/components/layout/Footer";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
