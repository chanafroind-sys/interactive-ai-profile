'use client';

import { useProfile } from './ProfileProvider';

interface UrlMeta {
  url?: string | null;
}
interface ValueMeta {
  value?: unknown;
}

/**
 * Dev-only panel that fires every action in the vocabulary against this
 * profile's real entity IDs — including two deliberately-broken cases
 * (unknown action, unknown ID) to prove the registry ignores them silently.
 * This is the proof that Task 05 becomes a thin layer over a working system.
 */
export function DebugActions() {
  const { profile, dispatch } = useProfile();

  if (process.env.NODE_ENV !== 'development') return null;

  const timelineIds = profile.entities.filter((e) => e.kind === 'experience' || e.kind === 'education').map((e) => e.id);
  const projectIds = profile.entities.filter((e) => e.kind === 'project').map((e) => e.id);
  const skillIds = profile.entities.filter((e) => e.kind === 'skill').map((e) => e.id);
  const snippetId = profile.entities.find((e) => e.kind === 'snippet')?.id;
  const metricId = profile.entities.find((e) => e.kind === 'award' && typeof (e.meta as ValueMeta).value === 'number')?.id;
  const linkableId =
    profile.entities.find((e) => e.kind === 'project' && !!(e.meta as UrlMeta).url)?.id ?? projectIds[0];

  const buttons: { label: string; disabled?: boolean; onClick: () => void }[] = [
    {
      label: `focus_timeline (1 id)`,
      disabled: timelineIds.length < 1,
      onClick: () => dispatch({ action: 'focus_timeline', ids: timelineIds.slice(0, 1) }),
    },
    {
      label: `focus_timeline (2 ids)`,
      disabled: timelineIds.length < 2,
      onClick: () => dispatch({ action: 'focus_timeline', ids: timelineIds.slice(0, 2) }),
    },
    {
      label: `show_cards (${Math.min(3, projectIds.length)} ids)`,
      disabled: projectIds.length < 1,
      onClick: () => dispatch({ action: 'show_cards', ids: projectIds.slice(0, 3) }),
    },
    {
      label: 'highlight_tools',
      disabled: skillIds.length < 1,
      onClick: () => dispatch({ action: 'highlight_tools', ids: skillIds.slice(0, 3) }),
    },
    {
      label: 'show_code',
      disabled: !snippetId,
      onClick: () => snippetId && dispatch({ action: 'show_code', id: snippetId }),
    },
    {
      label: 'show_metric',
      disabled: !metricId,
      onClick: () => metricId && dispatch({ action: 'show_metric', id: metricId }),
    },
    {
      label: 'open_link',
      disabled: !linkableId,
      // A CTA only has somewhere to render once its card is on screen — a
      // real AI response reaching for open_link would name the project in
      // the same breath, so pair it with show_cards here too.
      onClick: () => {
        if (!linkableId) return;
        dispatch({ action: 'show_cards', ids: [linkableId] });
        dispatch({ action: 'open_link', id: linkableId });
      },
    },
    { label: 'reset_view', onClick: () => dispatch({ action: 'reset_view' }) },
    {
      label: '⚠ unknown action',
      onClick: () => dispatch({ action: 'teleport', ids: ['does_not_matter'] }),
    },
    {
      label: '⚠ unknown id',
      onClick: () => dispatch({ action: 'show_cards', ids: ['proj_nonexistent'] }),
    },
  ];

  return (
    <div className="cyber-panel fixed left-4 top-4 z-50 flex max-w-[230px] flex-col gap-1 rounded-xl p-3 text-xs">
      <p className="mb-1 font-semibold" style={{ color: 'var(--neon-cyan)' }}>
        Debug actions (dev only)
      </p>
      {buttons.map((b) => (
        <button
          key={b.label}
          type="button"
          onClick={b.onClick}
          disabled={b.disabled}
          className="cyber-chip rounded-md px-2 py-1 text-left transition-colors hover:text-[var(--neon-cyan)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
