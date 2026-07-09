import { AuthGuard } from "@/components/auth/AuthGuard";

export default function ReportsPage() {
  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow">
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="mt-2 text-slate-600">
            Reports placeholder for Saleks Transport System.
          </p>
        </div>
      </main>
    </AuthGuard>
  );
}