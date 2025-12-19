import Link from "next/link";

export default function Home() {
  return (
    <div className="p-8 font-sans">
      <div className="mt-4">
        <Link href="/builder/ip-store" className="text-blue-700 underline">
          Go to Builder ip-store
        </Link>
      </div>
    </div>
  );
}
