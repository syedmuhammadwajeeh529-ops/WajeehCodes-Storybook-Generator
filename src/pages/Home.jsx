import React, { useEffect } from 'react';
import { Feather } from 'lucide-react';
import StartPage from '@/components/story/StartPage';
import StoryWorkspace from '@/components/story/StoryWorkspace';
import SavedStories from '@/components/story/SavedStories';
import useStorybook from '@/components/useStorybook';

export default function Home() {
  const s = useStorybook();
  useEffect(() => { s.loadBookshelf(); }, []);
  return <div className="min-h-screen bg-[#f4f1e9] text-[#293329]">
    <header className="border-b border-[#dedbd0] bg-[#f9f7f1]/90"><div className="max-w-7xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between">
      <button onClick={s.goToStart} className="flex items-center gap-2.5"><span className="w-9 h-9 rounded-full bg-[#354834] text-white flex items-center justify-center"><Feather size={18}/></span><span className="font-serif text-xl font-semibold tracking-tight">Storykind</span></button>
      <span className="hidden sm:block text-[11px] uppercase tracking-[0.2em] text-[#8c887d]">Create, edit &amp; save your stories</span>
    </div></header>
    <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      {s.view === 'start' && <StartPage onNew={s.startNewStory} onStories={s.goToStories} books={s.bookshelf} />}
      {s.view === 'workspace' && <StoryWorkspace {...s} />}
      {s.view === 'stories' && <SavedStories books={s.bookshelf} onBack={s.goToStart} onNew={s.startNewStory} onOpen={s.openBook} />}
    </main>
  </div>;
}