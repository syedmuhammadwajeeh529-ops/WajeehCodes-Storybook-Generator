import React from 'react';
import { BookOpen, PenLine, ArrowLeft, Library } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import CoverImage from './CoverImage';

export default function SavedStories({ books, onBack, onNew, onOpen }) {
  return <section aria-label="Saved stories" className="max-w-5xl mx-auto">
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-full bg-[#354834] text-white flex items-center justify-center"><Library size={18}/></span>
        <div><h1 className="font-serif text-3xl text-[#2c342b]">Saved Stories</h1><p className="text-sm text-[#8b887c]">Reopen a story and continue exactly where you left off.</p></div>
      </div>
      <div className="flex gap-2">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-xl border border-[#d7d0c3] bg-[#fffdf8] text-[#3c4436] px-4 py-2.5 text-sm font-semibold hover:bg-[#f4f1e9]"><ArrowLeft size={15}/> Start page</button>
        <button onClick={onNew} className="inline-flex items-center gap-1.5 rounded-xl bg-[#354834] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#253626]">Start a new story</button>
      </div>
    </div>

    {books.length === 0 ? <div className="mt-10 rounded-2xl border border-dashed border-[#c9c5b8] bg-[#f7f4ec] p-12 text-center">
      <BookOpen size={28} className="mx-auto text-[#8b887c]"/>
      <p className="font-serif text-2xl text-[#354834] mt-4">No saved stories yet</p>
      <p className="text-sm text-[#8b887c] mt-2 max-w-sm mx-auto">Stories you save will appear here, ready to reopen and continue editing anytime.</p>
    </div> :
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
        {books.map(b => <li key={b.id}><button onClick={() => onOpen(b.id)} className="group text-left w-full">
          <div className="relative">
            <CoverImage src={b.cover_url} alt={`Cover for ${b.title}`} className="group-hover:shadow-md transition-shadow" />
            <span className="absolute bottom-2 right-2 text-[#e9eee4] opacity-0 group-hover:opacity-100 transition-opacity"><span className="inline-flex bg-black/40 rounded-full p-1"><PenLine size={14}/></span></span>
            <span className="absolute top-2 left-2 text-[9px] uppercase tracking-[0.22em] text-white/90 bg-black/45 rounded-full px-2 py-0.5">{b.chapters} {b.chapters === 1 ? 'ch' : 'chs'}</span>
          </div>
          <span className="block mt-2 text-sm font-medium text-[#3c4436] leading-snug line-clamp-2">{b.title}</span>
          {b.idea ? <span className="block text-[11px] text-[#8b887c] mt-0.5 line-clamp-1">{b.idea}</span> : <span className="block text-[11px] text-[#8b887c] mt-0.5">{b.genre && b.genre !== 'Auto' ? b.genre : 'Story'}</span>}
          {b.updated && <span className="block text-[10px] text-[#a09a8c] mt-0.5">Updated {formatDistanceToNow(new Date(b.updated), { addSuffix: true })}</span>}
        </button></li>)}
      </ul>}
  </section>;
}