/**
 * BarangAI brand mark — a connected-nodes glyph on a green gradient tile.
 * `BrandLogo` is the full-color logo; `BrandGlyph` is the glyph alone in
 * currentColor for decorative treatments (e.g. the hero watermark).
 * Keep in sync with app/icon.svg (favicon).
 */

function Glyph({ className }: { className?: string }) {
  return (
    <g className={className}>
      <rect x="19" y="23" width="20" height="17" rx="6" fill="currentColor" />
      <rect x="57" y="20" width="19" height="18" rx="6" fill="currentColor" />
      <rect x="46" y="60" width="19" height="18" rx="6" fill="currentColor" />
      <rect x="37" y="27" width="22" height="8" fill="currentColor" />
      <line x1="32" y1="39" x2="52" y2="63" stroke="currentColor" strokeWidth="9" />
    </g>
  );
}

/** Full-color logo tile. Size it with width/height utility classes. */
export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="BarangAI logo">
      <defs>
        <linearGradient id="brandTile" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#587F2F" />
          <stop offset="100%" stopColor="#90AF58" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="24" fill="url(#brandTile)" />
      <g className="text-white">
        <Glyph />
      </g>
    </svg>
  );
}

/** Glyph only, drawn in currentColor — for watermarks and monochrome contexts. */
export function BrandGlyph({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden>
      <Glyph />
    </svg>
  );
}
