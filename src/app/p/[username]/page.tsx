import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { db } from '@/lib/db';
import { highlightSnippets } from '@/lib/highlight';
import { getAccessibleAccentPair } from '@/lib/color';
import type { ProfileJSON } from '@/types/profile';
import { ProfileProvider } from '@/components/profile/ProfileProvider';
import { CareerRoadmap } from '@/components/profile/roadmap/CareerRoadmap';
import { ToolGrid } from '@/components/profile/ToolGrid';
import { Toolbox } from '@/components/profile/Toolbox';
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
      className="accent-scope profile-dark min-h-screen bg-background text-foreground"
      style={{ '--accent-light': accent.light, '--accent-dark': accent.dark } as React.CSSProperties}
    >
      <Link
        href="/"
        rel="noopener"
        className="cyber-chip fixed right-4 top-4 z-50 rounded-full px-3.5 py-2 text-xs transition-colors hover:text-[var(--neon-cyan)]"
      >
        Build your own →
      </Link>

      <ProfileProvider profile={profile} snippetHtml={snippetHtml}>
        <DebugActions />

        {/* Three dedicated, regional grid columns — roadmap, tech
            stack/bio, projects — each with its own space and nothing
            forcing another to compress. Widths are tuned as close to an
            even ~35/35/30 split as the roadmap's fixed-pixel detail-card
            geometry allows (see CareerRoadmap/roadmap-layout: the card's
            clearance + width are real pixels, not percentages, so that
            column can't shrink below ~650px without the card risking
            spilling into the centre column). The 650px/370px split below
            keeps their *combined* width identical to the old 700+320,
            so the centre column's share — and this breakpoint itself —
            is unaffected; only the roadmap/projects balance shifted.
            The grid only switches on past `min-[1550px]` — the width
            where roadmap + gaps + a genuinely readable centre column +
            projects all actually fit. Below that, three squeezed columns
            would be worse than three full-width stacked sections, so it
            stacks instead: still zero overlap, just vertical. */}
        <main className="mx-auto flex max-w-[1680px] flex-col gap-10 px-4 pb-40 pt-10 min-[1550px]:grid min-[1550px]:grid-cols-[650px_minmax(460px,1fr)_370px] min-[1550px]:items-start min-[1550px]:gap-10">
          {/* Left: vertical roadmap. Scrolls with the page as a sidebar, not
              full-bleed — the marker/active-station tracking depends on each
              station's own position moving past the viewport centre as the
              user scrolls, so this can't be sticky-pinned. */}
          <div className="w-full">
            <CareerRoadmap />
          </div>

          {/* Centre: bio, tech stack + toolbox, metrics, code. */}
          <div className="min-w-0">
            <div className="cyber-panel flex items-center gap-4 rounded-2xl p-5">
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
                <h1 className="cyber-heading text-2xl font-bold">{profile.display_name}</h1>
                <p style={{ color: 'var(--neon-cyan)' }}>{profile.headline}</p>
              </div>
            </div>
            {summary && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-cyber-muted">{summary.body}</p>}

            {/* Tech stack + toolbox share a row so the toolbox sits
                natively at the top-right of this section instead of off in
                its own separate block. */}
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <ToolGrid />
              </div>
              <div className="shrink-0 self-center sm:self-start">
                <Toolbox />
              </div>
            </div>

            <MetricStrip />
            <CodePanel />
          </div>

          {/* Right: compact projects carousel. */}
          <div className="w-full min-[1550px]:sticky min-[1550px]:top-16 min-[1550px]:self-start">
            <CardPanel />
          </div>
        </main>

        <ChatWidget />
      </ProfileProvider>
    </div>
  );
}
