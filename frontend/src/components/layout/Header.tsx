import Link from "next/link";
import { getFacility } from "@/features/facility/logic/server";
import { HeaderUserMenu } from "./HeaderUserMenu";

export async function Header() {
  const facility = await getFacility();

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/" className="text-2xl font-bold text-primary">
          {facility.name}
        </Link>
        <HeaderUserMenu />
      </div>
    </header>
  );
}
