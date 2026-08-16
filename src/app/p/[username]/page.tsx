import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { db } from '@/lib/db';
import { highlightSnippets } from '@/lib/highlight';
import { getAccessibleAccentPair } from '@/lib/color';
import type { ProfileJSON } from '@/types/profile';
import { ProfileProvider } from '@/components/profile/ProfileProvider';
import { Timeline } from '@/components/profile/Timeline';
import { ToolGrid } from '@/components/profile/ToolGrid';
import { CardPanel } from '@/components/profile/CardPanel';
import { CodePanel } from '@/components/profile/CodePanel';
import { MetricStrip } from '@/components/profile/MetricStat';
import { DebugActions } from '@/components/profile/DebugActions';
import { ChatWidget } from '@/components/chat/ChatWidget';

export const revalidate = 3600;
export const dynamicParams = true;

// One row read per revalidation window — `cache()` dedupes it between
// generateMetadata and the page body within the same render pass.
const getProfileRow = cache(async (username: string) => {
  const { data, error } = await db()
    .from('profiles')
    .select('display_name, headline, avatar_url, theme, profile_json, is_published')
    .eq('username', username)
    .maybeSingle();
  if (error || !data || !data.is_published) return null;
  return data;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const row = await getProfileRow(username);
  if (!row) return {};

  const profile = row.profile_json as unknown as ProfileJSON;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const title = `${profile.display_name} — ${profile.headline}`;
  const pageUrl = siteUrl ? `${siteUrl}/p/${username}` : undefined;
  const images = profile.avatar_url ? [profile.avatar_url] : undefined;

  return {
    title,
    description: profile.headline,
    openGraph: { title, description: profile.headline, url: pageUrl, images, type: 'profile' },
    twitter: { card: 'summary', title, description: profile.headline, images },
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const row = await getProfileRow(username);
  if (!row) notFound();

  const profile = row.profile_json as unknown as ProfileJSON;
  const snippetHtml = await highlightSnippets(profile.entities);
  const accent = getAccessibleAccentPair(profile.theme.accent);
  const summary = profile.entities.find((e) => e.kind === 'summary');

  return (
    <div
      className="accent-scope min-h-screen"
      style={{ '--accent-light': accent.light, '--accent-dark': accent.dark } as React.CSSProperties}
    >
      <Link
        href="/"
        rel="noopener"
        className="fixed right-4 top-4 z-50 rounded-full border border-foreground/15 bg-background/90 px-3 py-1.5 text-xs text-foreground/70 backdrop-blur transition-colors hover:text-[var(--accent)]"
      >
        Build your own →
      </Link>

      <ProfileProvider profile={profile} snippetHtml={snippetHtml}>
        <DebugActions />

        <main className="mx-auto flex max-w-5xl flex-col gap-2 px-4 pb-40 pt-16 md:grid md:grid-cols-[1fr_340px] md:gap-x-8">
          <header className="md:col-span-2">
            <div className="flex items-center gap-4">
              {profile.avatar_url && (
                // Tenant-supplied, arbitrary-domain image — next/image's remote
                // pattern allowlist can't cover every customer's CDN.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  width={64}
                  height={64}
                  className="h-16 w-16 shrink-0 rounded-full object-cover"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                <p className="text-foreground/70">{profile.headline}</p>
              </div>
            </div>
            {summary && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/80">{summary.body}</p>}
          </header>

          <div className="flex min-w-0 flex-col">
            <Timeline />
            <ToolGrid />
            <MetricStrip />
            <CodePanel />
          </div>

          <div className="md:sticky md:top-16 md:self-start">
            <CardPanel />
          </div>
        </main>

        <ChatWidget />
      </ProfileProvider>
    </div>
  );
}
