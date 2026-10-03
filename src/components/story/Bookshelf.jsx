import React from 'react';
import { BookOpen, PenLine } from 'lucide-react';

export default function Bookshelf({ books, onOpen }) {
  return <section className="mt-12 sm:mt-16">
    <div className="flex items-end justify-between mb-5"><h2 className="font-serif text-2xl text-[#2c342b]">My Stories</h2><span className="text-sm text-[#8b887c]">{books.length} {books.length === 1 ? 'story' : 'stories'}</span></div>
    {books.length === 0 ? <div className="rounded-2xl border border-dashed border-[#c9c5b8] bg-[#f7f4ec] p-8 text-center text-sm text-[#8b887c]">Your saved stories will appear here, ready to reopen and continue editing.</div> :
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {books.map(b => <li key={b.id}><button onClick={() => onOpen(b.id)} className="group text-left w-full"><div className="relative aspect-[3/4] rounded-xl bg-[#41513f] shadow-sm group-hover:shadow-md transition-shadow overflow-hidden"><div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,#76856a_0%,#3a4c3c_55%,#25372f_100%)] flex flex-col items-center justify-center text-[#d9e1d2]"><BookOpen size={26} strokeWidth={1.2}/><span className="mt-3 text-[10px] uppercase tracking-[0.24em] text-white/70">{b.chapters} {b.chapters === 1 ? 'chapter' : 'chapters'}</span><span className="absolute bottom-4 right-4 text-[#e9eee4] opacity-0 group-hover:opacity-100 transition-opacity"><PenLine size={16}/></span></div></div><span className="block mt-2 text-sm font-medium text-[#3c4436] leading-snug line-clamp-2">{b.title}</span><span className="block text-[11px] text-[#8b887c] mt-0.5">{b.genre && b.genre !== 'Auto' ? b.genre : 'Story'}</span></button></li>)}
      </ul>}
  </section>;
}