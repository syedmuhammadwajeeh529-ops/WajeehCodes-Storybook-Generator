import React from 'react';
import { BookOpenText, Library } from 'lucide-react';

export default function StartPage({ onNew, onStories, books }) {
  return <section aria-label="Story Canvas AI start" className="max-w-3xl mx-auto text-center py-6 sm:py-12">
    <img
      src="/story-canvas-hero.svg"
      alt="An open storybook with a glowing quill and stars"
      className="w-56 sm:w-64 h-auto mx-auto drop-shadow-[0_18px_30px_rgba(87,72,150,0.16)]"
    />
    <h1 className="font-serif text-4xl sm:text-5xl leading-[1.08] tracking-tight mt-5 text-[#28304b]">Every idea<br /><em className="font-normal text-[#7864bd]">has a story.</em></h1>
    <p className="text-[#6f7082] leading-relaxed mt-4 max-w-md mx-auto">Type an idea, shape your characters and world, and write a story one chapter at a time — edit, regenerate, and save as you go.</p>
    <div className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
      <button onClick={onNew} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#51418b] text-white px-7 py-4 font-semibold hover:bg-[#40336f] transition-colors"><BookOpenText size={18}/> Start a new story</button>
      <button onClick={onStories} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d9d3e8] bg-[#fffdf8] text-[#443b61] px-7 py-4 font-semibold hover:bg-[#f4f0fb] transition-colors"><Library size={18}/> Saved stories {books.length > 0 && <span className="text-[#89839b] font-normal">({books.length})</span>}</button>
    </div>
    <p className="mt-8 text-xs text-[#89839b]">Dream · Write · Create. Your saved stories are always one tap away.</p>
  </section>;
}
