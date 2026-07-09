"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthGuard } from "@/components/auth/AuthGuard";

type AppShellProps = {
  title: string;
  children: ReactNode;
};

const navigationItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Courses", href: "/courses" },
  { label: "Customers", href: "/customers" },
  { label: "Trucks", href: "/trucks" },
  { label: "Reports", href: "/reports" },
  { label: "Settings", href: "/settings" },
];

export function AppShell({ title, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-100">
        <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white p-6 shadow-sm md:block">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Saleks Transport
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Transport Management System
            </p>
          </div>

          <nav className="mt-8 space-y-1">
            {navigationItems.map((item) => {
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className="absolute bottom-6 left-6 right-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Logout
          </button>
        </aside>

        <div className="md:pl-64">
          <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Saleks Transport System
                </p>
                <h2 className="text-xl font-bold text-slate-900">{title}</h2>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 md:hidden"
              >
                Logout
              </button>
            </div>
          </header>

          <main className="p-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}