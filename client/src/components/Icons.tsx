import type { SVGProps } from 'react';

/**
 * Icon set.
 *
 * Hand-drawn on a single 20×20 grid with a uniform 1.6 stroke, round caps and
 * round joins, so the whole set reads as one family rather than as clip-art
 * collected from different places. No icon library: eight icons do not justify
 * a dependency, and drawing them keeps the optical weight consistent.
 *
 * Every icon here is decorative — the label beside it always carries the
 * meaning — so they are all `aria-hidden`.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Stacked records — the size of the dataset. */
export const IconDatabase = (props: IconProps) => (
  <Icon {...props}>
    <ellipse cx="10" cy="5" rx="6.5" ry="2.5" />
    <path d="M3.5 5v5c0 1.38 2.91 2.5 6.5 2.5s6.5-1.12 6.5-2.5V5" />
    <path d="M3.5 10v5c0 1.38 2.91 2.5 6.5 2.5s6.5-1.12 6.5-2.5v-5" />
  </Icon>
);

/** Crosshair — targets that match the Buy Box. */
export const IconTarget = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="10" cy="10" r="7" />
    <circle cx="10" cy="10" r="3.2" />
    <path d="M10 1.5v2.2M10 16.3v2.2M18.5 10h-2.2M3.7 10H1.5" />
  </Icon>
);

/** Dial — a bounded 0-100 average. */
export const IconGauge = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 14.5a8 8 0 1 1 14 0" />
    <path d="M10 14.5 13.2 8.6" />
    <circle cx="10" cy="14.5" r="1.1" fill="currentColor" stroke="none" />
  </Icon>
);

/** Shield with a check — a verified, reachable record. */
export const IconShieldCheck = (props: IconProps) => (
  <Icon {...props}>
    <path d="M10 1.9 3.8 4.3v5c0 3.6 2.5 6.9 6.2 8.3 3.7-1.4 6.2-4.7 6.2-8.3v-5z" />
    <path d="m7.4 9.7 1.9 1.9 3.5-3.6" />
  </Icon>
);

/** Overlapping sheets — probable duplicate records. */
export const IconDuplicate = (props: IconProps) => (
  <Icon {...props}>
    <rect x="7" y="2.8" width="10" height="10" rx="1.6" />
    <path d="M13 16a1.6 1.6 0 0 1-1.6 1.2H4.6A1.6 1.6 0 0 1 3 15.6V8.4A1.6 1.6 0 0 1 4.2 6.8" />
  </Icon>
);

/** Dashed ring — a record with pieces missing. */
export const IconIncomplete = (props: IconProps) => (
  <Icon {...props}>
    <path d="M10 2.8a7.2 7.2 0 0 1 6.5 4.1M17.2 10a7.2 7.2 0 0 1-1.4 4.3M12.6 16.7a7.2 7.2 0 0 1-7.8-1.3M2.9 11.7A7.2 7.2 0 0 1 5.3 4.3" />
    <path d="M10 6.8v3.6" />
    <circle cx="10" cy="13.4" r=".9" fill="currentColor" stroke="none" />
  </Icon>
);

/**
 * Ascending steps with an upward arrow — digitization upside.
 * Deliberately not a warning glyph: a large gap is an opportunity here, not a fault.
 */
export const IconUpside = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2.8 16.5h14.4" />
    <path d="M5.5 16.5v-3.2M9.3 16.5v-5.6M13.1 16.5v-8" />
    <path d="m14.5 5.2 2.7-1.4-.4 3" />
    <path d="M17.2 3.8 13.1 8.5" />
  </Icon>
);

/** Ranked bars — the priority split. */
export const IconRanking = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3.4 5.2h12M3.4 10h8.4M3.4 14.8h4.8" />
  </Icon>
);

/** Filter funnel. */
export const IconFilter = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2.8 4.2h14.4l-5.6 6.6v5.3l-3.2 1.7v-7z" />
  </Icon>
);

export const IconArrowRight = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3.8 10h12.4M11.4 5.2 16.2 10l-4.8 4.8" />
  </Icon>
);
