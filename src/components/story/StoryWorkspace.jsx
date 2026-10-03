import React from 'react';
import { Feather, Sparkles as SparklesIcon } from 'lucide-react';
import IdeaPanel from './IdeaPanel';
import StoryReader from './StoryReader';

export default function StoryWorkspace(s) {
  // Story-level idea panel is shown when starting a NEW story (no book yet).
  // Once a book exists, the reader takes over and handles ongoing generation.
  return <section aria-label="Story workspace" className="grid lg:grid-cols-[minmax(320px,470px)_minmax(0,1fr)] gap-10 lg:gap-16 items-start">
    <div className="space-y-6">
      {!s.book && <>
        <div><span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] uppercase text-[#718062]"><SparklesIcon size={14}/> The story starts here</span><h1 className="font-serif text-4xl sm:text-5xl leading-[1.08] tracking-tight mt-4 text-[#283527]">Every idea<br/><em className="font-normal text-[#718062]">has a story.</em></h1><p className="text-[#6f7267] leading-relaxed mt-4 max-w-sm">Configure your characters, world and settings, then write your opening chapter.</p></div>
        <IdeaPanel
          idea={s.idea} onIdeaChange={s.setIdea}
          config={s.config} setConfig={s.setConfig}
          characters={s.characters} setCharacters={s.setCharacters}
          setting={s.setting} setSetting={s.setSetting}
          chapterSettings={s.chapterSettings} setChapterSettings={s.setChapterSettings}
          status={s.status} error={s.error} onGenerate={s.generate}
        />
      </>}
      {s.book && <div className="mt-2"><p className="text-[#847e70] text-sm leading-relaxed">Continuing <span className="font-semibold text-[#3c4436]">{s.book.title}</span>. Use the composer below the chapters to guide the next one.</p><button onClick={s.goToStart} className="mt-3 text-sm font-semibold text-[#57654b] hover:text-[#354834]">← Start page</button></div>}
    </div>
    <section id="story-reader" aria-label="Your story" className="bg-[#fffdf8] rounded-[1.75rem] border border-[#e2ded2] shadow-[0_15px_55px_rgba(66,57,40,0.06)] p-5 sm:p-9 lg:p-11 min-h-[620px]">
      {s.book ? <StoryReader
        {...s}
        onGenerateNext={s.generateNextChapter}
        onContinueAuto={s.continueAutomatically}
        onRegen={s.regenerateChapter}
        onDelete={s.deleteChapter}
        onEdit={s.saveChapterEdit}
        onAddAfter={(i) => s.addChapterAfter(i, 'manual')}
        onAddManual={() => s.addChapterAfter((s.book.chapters || []).length - 1, 'manual')}
        onSaveStory={s.saveStory}
      /> : <div className="min-h-[540px] flex flex-col items-center justify-center text-center px-4"><div className="relative w-44 h-56 rounded-r-xl rounded-l-sm bg-[#64745a] shadow-[9px_12px_0_#e2dfd4,13px_16px_22px_#d1ccbd] flex items-center justify-center"><div className="border border-[#b8c5ac]/70 w-32 h-44 flex flex-col items-center justify-center text-[#e9eee4]"><Feather size={30} strokeWidth={1}/><span className="block h-px w-12 bg-[#b8c5ac] mt-5"/></div></div><p className="font-serif text-2xl mt-11 text-[#354834]">A world waiting to be written</p><p className="text-sm text-[#898c80] mt-2 max-w-xs">Your story and its chapters will appear here after you generate them.</p></div>}
    </section>
  </section>;
}