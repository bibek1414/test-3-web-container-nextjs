import Link from "next/link";

export default function Home() {
  return (
    <div className="p-8 font-sans">
      <div className="mt-4">
        <Link href="/builder/nextjs-web-container" className="text-blue-700 underline">
          Go to Builder nextjs-web-container
        </Link>
      </div>
    </div>
  );
}
