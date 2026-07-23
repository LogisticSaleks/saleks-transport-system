"use client";

import { ReactNode } from "react";

import { AuthGuard } from "@/components/auth/AuthGuard";

type AppShellProps = {
  title: string;
  children: ReactNode;
};

export function AppShell({
  title,
  children,
}: AppShellProps) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-100">
        <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Saleks Transport System
              </p>

              <h1 className="text-xl font-bold text-slate-900">
                {title}
              </h1>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1800px] p-4 sm:p-6">
          <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}