export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">🌟 BarangAI</h1>
        <p className="mt-2 text-lg text-neutral-600">
          AI-powered Digital Twin and Decision Intelligence Platform for Smart Communities.
        </p>
      </div>
      <p className="text-neutral-500">
        Demo barangay: <span className="font-medium">Alibagu, Ilagan City, Isabela</span>.
      </p>
      <p className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
        Scaffold in progress. The deterministic scoring engine and contracts are in{" "}
        <code className="font-mono">lib/scoring</code> and <code className="font-mono">types</code>.
        The dashboard, map, and AI layer come next.
      </p>
    </main>
  );
}
