import { brand } from '../config/product';

/** The wordmark is brand art: always Latin, always left-to-right. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`wordmark ${className}`} dir="ltr" lang="en">
      {brand.wordmark}
    </span>
  );
}

/** Hairline rule with a small scroll flourish, after the booklet's page headings. */
export function Ornament({ className = '' }: { className?: string }) {
  return (
    <svg className={`ornament ${className}`} viewBox="0 0 240 14" aria-hidden="true" focusable="false">
      <path d="M0 7h100M140 7h100" stroke="currentColor" strokeWidth="1" fill="none" />
      <path
        d="M100 7c4 0 5-4 9-4s5 3 3 5-5 0-4-2M140 7c-4 0-5-4-9-4s-5 3-3 5 5 0 4-2M116 7c1.5-2 6.5-2 8 0-1.5 2-6.5 2-8 0z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Soft satin folds referencing the ribbon that wraps the packaging artwork. Decorative. */
export function SatinRibbon({ className = '' }: { className?: string }) {
  return (
    <svg className={`satin ${className}`} viewBox="0 0 1600 600" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="satin-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6e2130" />
          <stop offset="0.5" stopColor="#551723" />
          <stop offset="1" stopColor="#3d0d17" />
        </linearGradient>
        <linearGradient id="satin-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb8b0" stopOpacity="0" />
          <stop offset="0.45" stopColor="#ffb8b0" stopOpacity="0.13" />
          <stop offset="1" stopColor="#ffb8b0" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 250C300 110 520 330 860 245c290-72 490-160 740-90v330c-280-72-480 50-780 0S300 545 0 445z" fill="url(#satin-a)" />
      <path d="M0 292C320 160 540 365 880 282c280-66 500-150 720-86v52c-220-52-440 42-720 98C540 420 320 232 0 356z" fill="url(#satin-b)" />
      <path d="M0 445c300 100 520-25 820 25s500-72 780 0v36c-280-66-480 46-780 0S300 588 0 486z" fill="#2c070e" opacity="0.5" />
    </svg>
  );
}
