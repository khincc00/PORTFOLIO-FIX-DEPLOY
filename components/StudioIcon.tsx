import type { CSSProperties } from "react";

const paths: Record<string, string> = {
  home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  news: "M5 3h14v18H5ZM8 7h8M8 11h8M8 15h3M8 18h8",
  work: "M3 5h7l2 3h9v12H3ZM3 12h18",
  inbox: "M3 5h18v14H3ZM3 6l9 7 9-7",
  invoice: "M6 2h12v20l-3-2-3 2-3-2-3 2ZM9 7h6M9 11h6M9 15h4",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2",
  arrow: "M5 12h14M13 6l6 6-6 6",
  external: "M14 3h7v7M21 3 10 14M10 3H3v18h18v-7",
  plus: "M12 5v14M5 12h14",
  sync: "M20 7a9 9 0 0 0-15-2L2 8M2 3v5h5M4 17a9 9 0 0 0 15 2l3-3M22 21v-5h-5",
  check: "m5 12 4 4L19 6",
  phone: "M7 2h10v20H7ZM10 18h4",
  moon: "M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2",
  chat: "M3 3h18v14H8l-5 4Z",
  community:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  logout: "M9 3H3v18h6M9 12h12M16 7l5 5-5 5",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM15 15l6 6",
  close: "m6 6 12 12M6 18 18 6",
  globe:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM2 12h20M12 2c-6 6-6 14 0 20M12 2c6 6 6 14 0 20",
  lock: "M6 10h12v11H6ZM8 10V6a4 4 0 0 1 8 0v4M12 14v3",
};

export function Icon({
  name,
  size = 20,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name] || paths.arrow} />
    </svg>
  );
}

export function StudioLogo() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="Khincc Studio"
    >
      <rect width="40" height="40" rx="11" fill="currentColor" />
      <path
        d="M12 10v20M27 10 17 20l10 10"
        stroke="var(--s-surface, #fff)"
        strokeWidth="3.5"
        strokeLinecap="square"
      />
    </svg>
  );
}
