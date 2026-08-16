export type EntityKind = 'experience' | 'project' | 'skill' | 'education'
                       | 'award' | 'snippet' | 'faq' | 'summary';

export interface Entity {
  id: string;            // e.g. 'exp_acme_2021'
  kind: EntityKind;
  title: string;
  body: string;
  meta: Record<string, unknown>;   // dates, company, url, tech[], logo
  sort_order: number;
}

export interface ProfileJSON {
  display_name: string;
  headline: string;
  avatar_url: string | null;
  theme: { accent: string };
  entities: Entity[];
}

export type UiActionKind =
  | 'focus_timeline'
  | 'show_cards'
  | 'highlight_tools'
  | 'show_code'
  | 'show_metric'
  | 'open_link'
  | 'reset_view';

export interface UiAction {
  action: UiActionKind;
  ids?: string[];
  id?: string;
}
