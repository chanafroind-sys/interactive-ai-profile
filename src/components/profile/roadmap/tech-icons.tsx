import type { ReactElement, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;
export type TechIcon = (props: IconProps) => ReactElement;

/* ---------------------------------------------------------------------------
 * Ported from the v0 export's lib/tech-icons.tsx. Self-contained tech SVGs,
 * all using `currentColor` so they tint with the surrounding bubble's colour.
 * (The v0 original typed these as `JSX.Element`, which doesn't resolve under
 * this project's tsconfig — retyped to React's `ReactElement`.)
 * ------------------------------------------------------------------------- */

function ReactIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...props}>
      <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="10" ry="4.2" />
      <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)" />
    </svg>
  );
}

function PythonIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M11.9 2c-2 0-3.4.9-3.4 2.8v2h4v.6H6.2C4.3 7.4 3 8.8 3 11.9c0 3 1.1 4.3 3.2 4.3h1.3v-2.2c0-1.9 1.6-3.5 3.5-3.5h3.4c1.6 0 2.9-1.3 2.9-2.9V4.8C20.7 3 19.2 2 17.3 2zm-1.7 1.6a.9.9 0 110 1.8.9.9 0 010-1.8z" />
      <path
        d="M12.1 22c2 0 3.4-.9 3.4-2.8v-2h-4v-.6h6.3c1.9 0 3.2-1.4 3.2-4.5 0-3-1.1-4.3-3.2-4.3h-1.3v2.2c0 1.9-1.6 3.5-3.5 3.5H9.9C8.3 13.7 7 15 7 16.6v2.6C7 21 8.5 22 10.4 22zm1.7-1.6a.9.9 0 110-1.8.9.9 0 010 1.8z"
        opacity="0.75"
      />
    </svg>
  );
}

function JavaIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...props}>
      <path d="M9 3c2 1.6 2 2.8.5 4.4C8 9 8 10.2 10 11.5" />
      <path d="M12.5 6c1.6 1.2 1.6 2.2.4 3.4-1 1-1 1.8.6 2.9" />
      <path d="M6 14.5c3.5 1.4 8.5 1.4 12 0" />
      <path d="M7 17.5c3 1.2 7 1.2 10 0" />
      <path d="M9 20.4c1.8.7 4.2.7 6 0" />
    </svg>
  );
}

function JsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M9 9v5.2c0 1-.6 1.6-1.5 1.6S6 15.2 6 14.4" />
      <path d="M17.6 10.2c-.4-.8-1.2-1.2-2-1.2-1 0-1.8.6-1.8 1.6 0 2 3.4 1.3 3.4 3.4 0 1-.9 1.7-2 1.7-1 0-1.7-.5-2.1-1.3" />
    </svg>
  );
}

function TsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M7 10h5M9.5 10v6" />
      <path d="M18 10.4c-.5-.5-1.2-.7-1.9-.7-1 0-1.8.5-1.8 1.5 0 1.8 3.2 1.2 3.2 3.1 0 1-.9 1.5-1.9 1.5-.8 0-1.5-.3-1.9-.9" />
    </svg>
  );
}

function SqlIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...props}>
      <ellipse cx="12" cy="5.5" rx="7" ry="2.8" />
      <path d="M5 5.5v6c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-6" />
      <path d="M5 11.5v6c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-6" />
    </svg>
  );
}

function NodeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...props}>
      <path d="M12 2.5l8.2 4.7v9.6L12 21.5 3.8 16.8V7.2z" />
      <path d="M12 8v5.5c0 .9-.6 1.4-1.5 1.4-.8 0-1.4-.4-1.7-1" />
      <path d="M15 11c-.3-.6-1-1-1.9-1-1.1 0-1.9.5-1.9 1.4" />
    </svg>
  );
}

function CloudIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...props}>
      <path d="M7 18h10a3.5 3.5 0 000-7 5 5 0 00-9.6-1.4A3.6 3.6 0 007 18z" />
    </svg>
  );
}

function AiIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...props}>
      <rect x="7" y="7" width="10" height="10" rx="2.5" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4" />
    </svg>
  );
}

function DockerIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" {...props}>
      <path
        d="M3 12h15c1.5 0 2.6-.9 3-2.2.4.9 1.3.5 1.6 0-.2 1.7-1.4 2.9-3.2 3.2C18.6 16 15.5 18 11 18c-4 0-7-2-8-6z"
        fill="currentColor"
        stroke="none"
        opacity="0.85"
      />
      <path d="M5 11V8.5h2V11M8 11V8.5h2V11M11 11V8.5h2V11M8 8V5.5h2V8M11 8V5.5h2V8" />
    </svg>
  );
}

function GitIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...props}>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M6 8.2v7.6M8 6.6c4.5.4 7 1.6 7 4.4v.6" />
    </svg>
  );
}

function WebIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.4 2.6 15.6 0 18M12 3c-2.6 2.4-2.6 15.6 0 18" />
    </svg>
  );
}

function TeamIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...props}>
      <circle cx="9" cy="8" r="2.6" />
      <circle cx="17" cy="9" r="2.1" />
      <path d="M4 18c0-2.8 2.2-4.6 5-4.6s5 1.8 5 4.6M15 13.6c2.4 0 4 1.5 4 3.9" />
    </svg>
  );
}

function LeadIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...props}>
      <path d="M5 18h14M6 16l-1.5-8 4 3L12 6l3.5 5 4-3L18 16z" />
    </svg>
  );
}

function DataIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...props}>
      <path d="M4 20V10M9.3 20V4M14.6 20v-8M20 20V7" />
    </svg>
  );
}

function ChipIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...props}>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M10 3v2M14 3v2M10 19v2M14 19v2M3 10h2M3 14h2M19 10h2M19 14h2" />
    </svg>
  );
}

const RULES: { icon: TechIcon; keywords: string[] }[] = [
  { icon: ReactIcon, keywords: ['react', 'next', 'ריאקט'] },
  { icon: TsIcon, keywords: ['typescript', 'ts '] },
  { icon: JsIcon, keywords: ['javascript', 'js'] },
  { icon: PythonIcon, keywords: ['python', 'פייתון', 'django', 'flask', 'fastapi'] },
  { icon: JavaIcon, keywords: ['java', 'spring', "ג'אווה", 'גאווה'] },
  { icon: NodeIcon, keywords: ['node', 'express', 'nest'] },
  { icon: DockerIcon, keywords: ['docker', 'kubernetes', 'k8s', 'helm', 'container', 'קונטיינר'] },
  { icon: GitIcon, keywords: ['git', 'github', 'גיט', 'version'] },
  { icon: CloudIcon, keywords: ['cloud', 'ענן', 'aws', 'azure', 'gcp', 'cloudflare', 'workers'] },
  { icon: AiIcon, keywords: ['ai', 'ml', 'machine', 'בינה', 'מכונה', 'למידת', 'גנרטיב', 'llm', 'מודל'] },
  { icon: DataIcon, keywords: ['data', 'דאטה', 'אנליטיקה', 'analytics', 'pgvector'] },
  { icon: SqlIcon, keywords: ['sql', 'database', 'mongo', 'postgres', 'redis', 'supabase', 'מסד', 'נתונים', 'מבני'] },
  { icon: WebIcon, keywords: ['web', 'ווב', 'אפליקצי', 'frontend', 'פרונט', 'אתר', 'rails'] },
  { icon: TeamIcon, keywords: ['team', 'צוות', 'collab', 'שיתוף', 'סקרנות'] },
  { icon: LeadIcon, keywords: ['lead', 'מנהיג', 'הובלה', 'ניהול', 'mentor', 'חניכה', 'product', 'מוצר', 'חזון'] },
];

/** Returns the tech SVG icon component best matching a skill label. */
export function getTechIcon(label: string): TechIcon {
  const l = label.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => l.includes(k.trim()))) return rule.icon;
  }
  return ChipIcon;
}
