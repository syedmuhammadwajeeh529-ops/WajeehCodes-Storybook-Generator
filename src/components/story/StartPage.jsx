import React from 'react';
import { Feather, BookOpenText, Library } from 'lucide-react';

export default function StartPage({ onNew, onStories, books }) {
  return <section aria-label="Storybook Generator start" className="max-w-2xl mx-auto text-center py-6 sm:py-12">
    <div className="mx-auto flex items-center justify-center gap-3 text-[#354834]">
      <span className="w-14 h-14 rounded-full bg-[#354834] text-white flex items-center justify-center"><Feather size={26}/></span>
    </div>
    <h1 className="font-serif text-4xl sm:text-5xl leading-[1.08] tracking-tight mt-8 text-[#283527]">Every idea<br /><em className="font-normal text-[#718062]">has a story.</em></h1>
    <p className="text-[#6f7267] leading-relaxed mt-4 max-w-md mx-auto">Type an idea, shape your characters and world, and write a story one chapter at a time — edit, regenerate, and save as you go.</p>
    <div className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
      <button onClick={onNew} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#354834] text-white px-7 py-4 font-semibold hover:bg-[#253626] transition-colors"><BookOpenText size={18}/> Start a new story</button>
      <button onClick={onStories} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d7d0c3] bg-[#fffdf8] text-[#3c4436] px-7 py-4 font-semibold hover:bg-[#f4f1e9] transition-colors"><Library size={18}/> Saved stories {books.length > 0 && <span className="text-[#8b887c] font-normal">({books.length})</span>}</button>
    </div>
    <p className="mt-8 text-xs text-[#8b887c]">Start fresh each time — your saved stories are always one tap away.</p>
  </section>;
}