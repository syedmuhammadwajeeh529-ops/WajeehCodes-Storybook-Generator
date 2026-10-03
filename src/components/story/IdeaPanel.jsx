import React from 'react';
import { Sparkles, BookOpenText } from 'lucide-react';
import { GenrePicker, ChapterLengthPicker, SettingInput, CharacterSection, PerspectivePicker, AudiencePicker, FormatPicker, LanguagePicker } from './StoryConfig';

export default function IdeaPanel({ idea, onIdeaChange, config, setConfig, characters, setCharacters, setting, setSetting, chapterSettings, setChapterSettings, status, error, onGenerate }) {
  const busy = status === 'story' || status === 'regen';
  const steps = ['Story idea', 'Story settings', 'Characters', 'Setting', 'Chapter 1', 'Generate'];
  return <form onSubmit={(e) => { e.preventDefault(); if (idea.trim() && !busy) onGenerate(); }} className="space-y-5">
    <ol className="flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8b887c]">
      {steps.map((s, i) => <li key={s} className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-[#e5e1d4] text-[#57654b] flex items-center justify-center text-[9px]">{i + 1}</span>{s}{i < steps.length - 1 && <span className="text-[#c9c5b8] ml-1.5">→</span>}</li>)}
    </ol>

    <div>
      <label htmlFor="story-idea" className="block text-xs font-bold tracking-[0.18em] uppercase text-[#746e62] mb-1.5">Your story idea</label>
      <textarea id="story-idea" value={idea} onChange={e => onIdeaChange(e.target.value)} placeholder="A lighthouse keeper finds a letter addressed to someone who hasn't been born yet…" className="w-full min-h-[130px] resize-y rounded-2xl border border-[#d7d0c3] bg-[#fffdf8] px-5 py-4 text-[16px] leading-relaxed text-[#22251f] placeholder:text-[#a7a094] focus:outline-none focus:ring-2 focus:ring-[#57654b]/40 focus:border-[#57654b] transition-shadow" />
      <p className="mt-1.5 text-sm text-[#847e70]">Type your idea and fine-tune the words before continuing.</p>
    </div>

    {idea.trim().length > 0 && <div className="space-y-4">
      <div>
        <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#746e62] mb-2">Story settings <span className="font-normal normal-case text-[#a7a094]">— apply to the whole story</span></p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <PerspectivePicker value={config.perspective} onChange={v => setConfig({ ...config, perspective: v })} />
          <AudiencePicker value={config.audience} onChange={v => setConfig({ ...config, audience: v })} />
          <FormatPicker value={config.format} onChange={v => setConfig({ ...config, format: v })} />
          <LanguagePicker value={config.language} onChange={v => setConfig({ ...config, language: v })} />
        </div>
      </div>
      <SettingInput value={setting} onChange={setSetting} />
      <CharacterSection characters={characters} onChange={setCharacters} />
      <div>
        <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#746e62] mb-2">Chapter settings <span className="font-normal normal-case text-[#a7a094]">— for the next chapter only</span></p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <GenrePicker value={chapterSettings.genre} onChange={v => setChapterSettings({ ...chapterSettings, genre: v })} />
          <ChapterLengthPicker mode={chapterSettings.lengthMode} onModeChange={v => setChapterSettings({ ...chapterSettings, lengthMode: v })} wordMin={chapterSettings.wordMin} wordMax={chapterSettings.wordMax} onRangeChange={(k, v) => setChapterSettings({ ...chapterSettings, [k === 'min' ? 'wordMin' : 'wordMax']: v })} />
        </div>
      </div>
    </div>}

    {error && <p role="alert" className="text-sm text-[#a34235] bg-[#f9eee9] rounded-xl p-3">{error}</p>}

    <button type="submit" disabled={busy || !idea.trim()} className="w-full rounded-2xl bg-[#354834] text-white px-5 py-4 flex items-center justify-center gap-2 font-semibold hover:bg-[#253626] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
      {busy ? <><Sparkles size={17} className="animate-pulse"/>{status === 'story' ? 'Writing Chapter 1…' : 'Writing…'}</>
        : <><BookOpenText size={17}/> Generate Chapter 1</>}
    </button>
  </form>;
}