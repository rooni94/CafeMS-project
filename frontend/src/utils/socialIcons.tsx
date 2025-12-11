import React from "react";

const iconProps = "w-5 h-5";

const baseCircle = (children: React.ReactNode, color = "#f59e0b") => (
  <span
    className={`inline-flex items-center justify-center rounded-full bg-white shadow border border-amber-100 ${iconProps}`}
    style={{ color }}
  >
    {children}
  </span>
);

const PATH_STYLE = { strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const icons: Record<string, JSX.Element> = {
  instagram: baseCircle(
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...PATH_STYLE}>
      <rect x="4" y="4" width="16" height="16" rx="5" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  twitter: baseCircle(
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...PATH_STYLE}>
      <path d="M22 5.9c-.7.3-1.4.5-2.2.6.8-.5 1.3-1.2 1.6-2.2-.7.4-1.5.8-2.3.9a3.6 3.6 0 0 0-6.1 3.3 10.4 10.4 0 0 1-7.6-3.9c-.8 1.2-.4 3 .8 3.9-.6 0-1.1-.2-1.6-.4 0 1.5 1 2.9 2.5 3.3-.5.1-1 .2-1.5.1.4 1.3 1.6 2.3 3 2.3a7.2 7.2 0 0 1-5.3 1.5 10.2 10.2 0 0 0 15.7-9v-.5c.8-.5 1.4-1.1 1.9-1.8Z" />
    </svg>
  ),
  snapchat: baseCircle(
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...PATH_STYLE}>
      <path d="M16.3 5.6c-.7-.8-1.8-1.3-3.3-1.3-1.5 0-2.6.5-3.3 1.3-.6.7-.9 1.7-.9 2.9 0 1.8-.5 2.8-1.4 3.4-.4.3-.7.3-.8.7 0 .3.2.7.7.9.3.2.6.3.8.5.4.2.5.6.4.8a.7.7 0 0 1-.7.4c-.3 0-.7-.1-1.2-.1-.5 0-.9.1-1.2.3-.3.2-.4.4-.3.6.1.4.8.6 1.4.8.6.2.9.3.9.5 0 .3-.4.5-.9.6l-1 .3c-.5.2-.7.4-.6.7.1.4.7.6 1.3.6.7 0 1.3-.2 1.8-.2.4 0 .7 0 1 .2.8.5 2 1.2 3.4 1.2 1.4 0 2.6-.7 3.4-1.2.3-.1.6-.2 1-.2.5 0 1.1.2 1.8.2s1.2-.2 1.3-.6c0-.3-.2-.5-.7-.6l-1-.3c-.5-.1-.9-.3-.9-.6 0-.2.3-.3.8-.5.6-.2 1.3-.4 1.4-.8.1-.2 0-.4-.3-.6-.3-.2-.7-.3-1.2-.3s-.9.1-1.2.1a.7.7 0 0 1-.7-.4c-.1-.2 0-.6.4-.8.2-.2.5-.3.8-.5.5-.2.7-.6.7-.9 0-.4-.3-.4-.7-.7-.9-.6-1.4-1.6-1.4-3.4 0-1.2-.3-2.2-.9-2.9Z" />
    </svg>
  ),
  tiktok: baseCircle(
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...PATH_STYLE}>
      <path d="M14.5 4.5c.4 2 1.8 3.3 3.7 3.5v3.1c-1.3 0-2.5-.4-3.7-1.2v5.9a4 4 0 1 1-4.2-4V8.6h3v2.2" />
    </svg>
  ),
  youtube: baseCircle(
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...PATH_STYLE}>
      <path d="M4 8.2C4 6.5 5.3 5 6.9 5c2.3-.2 4.7-.2 7 0 1.6 0 2.9 1.5 2.9 3.2v7.6c0 1.8-1.3 3.2-2.9 3.2-2.3.2-4.7.2-7 0C5.3 19 4 17.6 4 15.8V8.2Z" />
      <path d="m10.5 9.5 4.2 2.5-4.2 2.5v-5Z" fill="currentColor" stroke="none" />
    </svg>
  ),
  facebook: baseCircle(
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...PATH_STYLE}>
      <path d="M15 5h-2.2c-1.2 0-2 .9-2 2v2H8v3h2.8v7H14v-7h2.4l.6-3H14V7.3c0-.4.3-.8.8-.8H15V5Z" />
    </svg>
  ),
  whatsapp: baseCircle(
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...PATH_STYLE}>
      <path d="M6.5 19.5 5 22l2.8-.7A9 9 0 1 0 6.5 19.5Z" />
      <path d="M9.8 9a3 3 0 0 0 4 4c.4-.3 1.3-.3 1.6-.1.3.3 1.3 1.4 1.3 1.4s.5.7-.2 1.5-1.8 1.1-2.9 1c-1-.1-2.1-.4-3.1-1-1-.5-1.9-1.2-2.6-2s-1.4-1.7-1.9-2.7c-.5-1-.8-2-.9-3.1 0-1.1.3-2.1 1-2.9.8-.7 1.4-.2 1.4-.2s1.1 1 1.4 1.3-.1 1.2-.1 1.6Z" />
    </svg>
  ),
};

const defaultIcon = baseCircle(
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...PATH_STYLE}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c-2.2 2.6-3.4 5.3-3.4 8.5 0 3.1 1.2 5.8 3.4 8.5m0-17c2.2 2.6 3.4 5.3 3.4 8.5 0 3.1-1.2 5.8-3.4 8.5" />
  </svg>
);

export const getSocialIcon = (platform?: string) => {
  if (!platform) return defaultIcon;
  const key = platform.toLowerCase().trim();
  return icons[key] || defaultIcon;
};
