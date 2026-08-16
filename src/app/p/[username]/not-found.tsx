import Link from 'next/link';

export default function ProfileNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-bold">Profile not found</h1>
      <p className="max-w-sm text-foreground/70">
        This profile doesn&apos;t exist, or hasn&apos;t been published yet.
      </p>
      <Link href="/" className="mt-2 text-sm underline underline-offset-4">
        Back to home
      </Link>
    </main>
  );
}
