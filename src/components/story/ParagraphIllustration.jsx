import React from 'react';
import { Loader2 } from 'lucide-react';

// Renders a chapter's paragraphs as alternating rows: each activity paragraph is
// a two-column row (text left, its matching illustration right on desktop; stacked
// on mobile). Paragraphs without an illustration render as full-width prose rows.
// `illustrating` is true while this chapter's images are still being generated.
export default function ParagraphIllustration({ paragraphs, illustrations, illustrating }) {
  const illos = illustrations || {};
  const list = Array.isArray(paragraphs) ? paragraphs : [];
  if (!list.length) return null;
  return (
    <div className="space-y-6 mt-5">
      {list.map((paragraph, i) => {
        const url = illos[i];
        const pending = illustrating && url === undefined;
        const hasImage = !!url;
        if (!hasImage && !pending) {
          return (
            <p key={i} className="font-serif text-[17px] leading-[1.9] text-[#333930] whitespace-pre-line">
              {paragraph}
            </p>
          );
        }
        return (
          <div key={i} className="grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-5 md:gap-6 items-start">
            <p className="font-serif text-[17px] leading-[1.9] text-[#333930] whitespace-pre-line md:order-1 order-2">
              {paragraph}
            </p>
            <div className="md:order-2 order-1">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-[#e2ded2] bg-[#41513f] shadow-sm">
                {hasImage ? (
                  <img src={url} alt={`Illustration for paragraph ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,#76856a_0%,#3a4c3c_55%,#25372f_100%)] flex flex-col items-center justify-center text-[#d9e1d2]">
                    {pending ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/80">
                        <Loader2 size={12} className="animate-spin" /> Painting…
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">Illustration</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}