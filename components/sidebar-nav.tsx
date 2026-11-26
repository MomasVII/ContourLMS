"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type SidebarItem = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
};

const studentItems: SidebarItem[] = [
  {
    href: "/",
    label: "Dashboard",
    isActive: (pathname) => pathname === "/",
  },
  {
    href: "/consultations/book",
    label: "Book consultation",
    isActive: (pathname) => pathname.startsWith("/consultations/book"),
  },
  {
    href: "/consultations",
    label: "My consultations",
    isActive: (pathname) =>
      pathname === "/consultations" ||
      (pathname.startsWith("/consultations/") &&
        !pathname.startsWith("/consultations/book")),
  },
];

const adminItems: SidebarItem[] = [
  {
    href: "/",
    label: "Dashboard",
    isActive: (pathname) => pathname === "/",
  },
  {
    href: "/admin/consultations",
    label: "All consultations",
    isActive: (pathname) => pathname.startsWith("/admin/consultations"),
  },
];

export function SidebarNav({ role }: { role: "student" | "admin" }) {
  const pathname = usePathname();
  const items = role === "admin" ? adminItems : studentItems;

  return (
    <nav aria-label={role === "admin" ? "Admin" : "Student"} className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const active = item.isActive(pathname);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm",
              active ? "bg-accent font-medium" : "hover:bg-accent/60",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
