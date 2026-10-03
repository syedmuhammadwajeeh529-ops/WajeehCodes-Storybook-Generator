import React from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';

// Renders a book cover. When a cover_url exists it shows the generated image;
// otherwise it shows the fallback gradient with a book icon. While a cover is
// being painted, a subtle spinner overlays the fallback.
export default function CoverImage({ src, alt, painting = false, className = '', rounded = 'rounded-xl' }) {
  const base = `relative aspect-[3/4] ${rounded} bg-[#41513f] shadow-sm overflow-hidden ${className}`;
  if (src) {
    return (
      <div className={base}>
        <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover" />
        {painting && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-white" />
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={base}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,#76856a_0%,#3a4c3c_55%,#25372f_100%)] flex flex-col items-center justify-center text-[#d9e1d2]">
        <ImageIcon size={26} strokeWidth={1.2} />
        {painting ? (
          <span className="mt-3 text-[10px] uppercase tracking-[0.24em] text-white/80 inline-flex items-center gap-1.5">
            <Loader2 size={11} className="animate-spin" /> Painting cover…
          </span>
        ) : (
          <span className="mt-3 text-[10px] uppercase tracking-[0.24em] text-white/70">Cover</span>
        )}
      </div>
    </div>
  );
}