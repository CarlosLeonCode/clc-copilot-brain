// Tailwind class lists of the sales page (sales-view, sales-dashboard, sales-sections). Pure data, no I/O.
// Every class here must be compiled into src/core/styles/compiled.js: this file is an @source of styles/brain.css,
// so write whole class names only (never build them from pieces). Run `npm run build:css` after a change.

export const BODY = 'm-0 bg-page text-ink font-sans text-base/[1.6]';
// Element rules for the whole page (headings, collapsible sections and tables, including the ones written from markdown).
export const MAIN = 'max-w-[960px] mx-auto pt-8 px-4 pb-16 '
  + '[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-[1.4rem] '
  + '[&_details]:mt-3 [&_details]:border-t [&_details]:border-line [&_details]:pt-2.5 '
  + '[&_summary]:cursor-pointer [&_summary]:font-semibold [&_summary]:text-accent '
  + '[&_table]:border-collapse [&_table]:w-full [&_table]:mt-2 [&_table]:text-[.95rem] '
  + '[&_th]:text-left [&_th]:align-top [&_th]:border-b [&_th]:border-line [&_th]:py-1.5 [&_th]:px-2.5 [&_th]:text-muted [&_th]:font-semibold '
  + '[&_td]:text-left [&_td]:align-top [&_td]:border-b [&_td]:border-line [&_td]:py-1.5 [&_td]:px-2.5';
export const HEADER = '[&_h1]:m-0 [&_h1]:text-[1.9rem] [&_h1]:leading-[1.2] [&_p]:mt-1 [&_p]:mb-0 [&_p]:text-muted';
export const NAV = 'my-6 flex flex-wrap gap-2 '
  + '[&_a]:px-3 [&_a]:py-1.5 [&_a]:rounded-full [&_a]:bg-accent-soft [&_a]:text-accent [&_a]:no-underline [&_a]:text-[.95rem] [&_a:hover]:underline';
export const CARD = 'bg-card border border-line rounded-[14px] py-5 px-6 my-4';
export const CARD_DASH = 'bg-card border border-line rounded-[14px] py-5 px-6 my-4 [&_h4]:mt-5 [&_h4]:mb-1';
export const CARD_HEAD = 'flex flex-wrap items-center gap-3 [&_h3]:m-0 [&_h3]:text-[1.25rem]';
export const BADGE = 'text-[.8rem] text-muted border border-line rounded-full py-0.5 px-2.5';
export const BADGE_DRAFT = 'text-[.8rem] text-draft-ink bg-draft border border-draft-line rounded-full py-0.5 px-2.5 font-semibold';
export const LABEL = 'font-semibold';
export const MUTED = 'text-muted';
export const NOTE = 'text-[.9rem] text-muted bg-accent-soft rounded-[10px] py-2 px-3';
export const NOTE_PREVIEW = 'text-[.9rem] text-draft-ink bg-draft border border-draft-line rounded-[10px] py-2 px-3';
export const NOTE_NEEDS_FIX = 'text-[.9rem] text-draft-ink bg-draft rounded-[10px] py-2 px-3';
export const DIAGRAM_TREE = 'overflow-x-auto my-4 p-3 rounded-[10px] bg-page [&_svg]:block [&_svg]:mx-auto [&_svg]:max-w-full [&_svg]:h-auto';
export const DIAGRAM_WIDE = 'overflow-x-auto [-webkit-overflow-scrolling:touch] my-4 p-3 rounded-[10px] bg-page [&_svg]:block [&_svg]:m-0 [&_svg]:max-w-none [&_svg]:h-auto';
export const DIAGRAM_TEXT = '[&_ol]:mt-2 [&_ol]:mb-0 [&_ul]:text-muted';
export const TALK_LIST = 'list-none p-0';
export const TALK_ITEM = 'my-3 pl-3 border-l-[3px] border-accent-soft';
export const WHEN = 'block text-[.9rem] text-muted';
export const SAY = 'block';
export const SCRIPT_LINK = 'block text-[.9rem]';
export const FOOTER = 'mt-12 text-muted text-[.9rem]';

// "How it's going" dashboard.
export const METRIC = 'my-2.5';
export const METRIC_HEAD = 'flex flex-wrap justify-between gap-x-4 gap-y-1';
export const METRIC_NAME = 'font-semibold';
export const METRIC_TEXT = 'text-muted';
export const BAR = 'h-2 rounded-full bg-accent-soft overflow-hidden mt-1';
export const BAR_FILL = 'h-full bg-accent';
export const SUB = 'mt-1 mb-0 ml-3 pl-3 border-l-[3px] border-accent-soft text-muted text-[.95rem]';
