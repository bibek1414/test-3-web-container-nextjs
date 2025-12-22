import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center font-sans">
      <div className="max-w-2xl w-full text-center px-6">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
          Build & Preview Next.js Apps
        </h1>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/builder/nextjs-web-container"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-white font-semibold shadow-lg hover:bg-blue-700 transition"
          >
            🚀 Open Builder
          </Link>
        </div>
      </div>
    </main>
  );
}
