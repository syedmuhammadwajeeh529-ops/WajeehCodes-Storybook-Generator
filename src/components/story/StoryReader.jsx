import React, { useEffect, useState } from 'react';
import { RefreshCw, Save, Check, PenLine, X, Plus, Trash2, Sparkles, Loader2, Play } from 'lucide-react';
import { GenrePicker, ChapterLengthPicker } from './StoryConfig';
import { lengthLabel } from './storyOptions';
import CoverImage from './CoverImage';
import ParagraphIllustration from './ParagraphIllustration';

function ChapterEditor({ chapter, onSave, onCancel }) {
  const [heading, setHeading] = useState(chapter.heading);
  const [body, setBody] = useState(chapter.body);
  const save = () => onSave({ heading: heading.trim() || chapter.heading, body });
  return <div className="space-y-3">
    <input value={heading} onChange={e => setHeading(e.target.value)} className="w-full rounded-lg border border-[#d7d0c3] bg-white px-3 py-2 font-serif text-2xl text-[#293329] focus:outline-none focus:ring-1 focus:ring-[#57654b]/40" />
    <textarea value={body} onChange={e => setBody(e.target.value)} className="w-full min-h-[280px] resize-y rounded-lg border border-[#d7d0c3] bg-white px-3 py-2 font-serif text-[17px] leading-[1.85] text-[#333930] focus:outline-none focus:ring-1 focus:ring-[#57654b]/40" />
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={save} className="inline-flex items-center gap-1.5 rounded-lg bg-[#354834] text-white px-4 py-2 text-sm font-semibold hover:bg-[#253626]"><Check size={15}/> Save changes</button>
      <button type="button" onClick={onCancel} className="inline-flex items-center gap-1.5 rounded-lg bg-[#eeeae0] text-[#586252] px-4 py-2 text-sm font-semibold hover:bg-[#e0e5d7]"><X size={15}/> Cancel</button>
    </div>
  </div>;
}

function ChapterBlock({ chapter, index, status, onEdit, onRegen, onDelete, onAddAfter, defaultEditing, illustrating }) {
  const [editing, setEditing] = useState(!!defaultEditing);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const regenBusy = status === `regen:${index}`;
  if (editing) {
    return <div className="rounded-2xl border border-[#e2ded2] bg-[#fffdf8] p-5">
      <p className="text-[11px] uppercase font-bold tracking-[0.22em] text-[#718062] mb-3">Chapter {index + 1}</p>
      <ChapterEditor chapter={chapter} onSave={(ch) => { onEdit(index, ch); setEditing(false); }} onCancel={() => setEditing(false)} />
    </div>;
  }
  return <div className="rounded-2xl border border-[#e2ded2] bg-[#fffdf8] p-5 sm:p-7">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] uppercase font-bold tracking-[0.22em] text-[#718062]">Chapter {index + 1}</p>
        <h3 className="font-serif text-2xl sm:text-3xl text-[#293329] mt-2">{chapter.heading || 'Untitled chapter'}</h3>
        {chapter.mode === 'manual' && <span className="inline-block mt-1.5 text-[10px] uppercase tracking-[0.18em] text-[#8b887c] bg-[#eeeae0] rounded-full px-2.5 py-0.5">Written by you</span>}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-[#8b887c]">
          {chapter.genre && chapter.genre !== 'Auto' && <span>Genre: <span className="text-[#57654b] font-semibold">{chapter.genre}</span></span>}
          {chapter.lengthMode && <span>Length: <span className="text-[#57654b] font-semibold">{lengthLabel(chapter.lengthMode, chapter.wordMin, chapter.wordMax)}</span></span>}
          {chapter.wordCount ? <span><span className="text-[#57654b] font-semibold">{chapter.wordCount.toLocaleString()}</span> words</span> : null}
        </div>
      </div>
    </div>
    <ParagraphIllustration paragraphs={(chapter.body || '').split(/\n\s*\n/).filter(Boolean)} illustrations={chapter.illustrations} illustrating={illustrating} />
    <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-[#e1ded3]">
      <button type="button" onClick={() => setEditing(true)} disabled={regenBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-[#c5c0b2] bg-white text-[#3c4436] px-3 py-2 text-xs font-semibold hover:bg-[#f4f1e9] disabled:opacity-60"><PenLine size={14}/> Edit</button>
      <button type="button" onClick={() => onRegen(index)} disabled={regenBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-[#c5c0b2] bg-white text-[#3c4436] px-3 py-2 text-xs font-semibold hover:bg-[#f4f1e9] disabled:opacity-60">{regenBusy ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>} {regenBusy ? 'Rewriting…' : 'Regenerate'}</button>
      <button type="button" onClick={() => onAddAfter(index)} disabled={regenBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-[#c5c0b2] bg-white text-[#3c4436] px-3 py-2 text-xs font-semibold hover:bg-[#f4f1e9] disabled:opacity-60"><Plus size={14}/> Add chapter after</button>
      {confirmingDelete
        ? <span className="inline-flex items-center gap-2 rounded-lg border border-[#e5c9c2] bg-[#f9eee9] px-3 py-2 text-xs">
            <span className="text-[#a34235] font-semibold">Delete this chapter?</span>
            <button type="button" onClick={() => { setConfirmingDelete(false); onDelete(index); }} disabled={regenBusy} className="font-bold text-[#a34235] hover:underline">Yes</button>
            <button type="button" onClick={() => setConfirmingDelete(false)} disabled={regenBusy} className="font-semibold text-[#6c7266] hover:underline">Cancel</button>
          </span>
        : <button type="button" onClick={() => setConfirmingDelete(true)} disabled={regenBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5c9c2] bg-white text-[#a34235] px-3 py-2 text-xs font-semibold hover:bg-[#f9eee9] disabled:opacity-60"><Trash2 size={14}/> Delete</button>}
    </div>
  </div>;
}

function ChapterComposer({ nextNumber, suggestions, onGenerateNext, onContinueAuto, onAddManual, status, idea, setIdea, detail, setDetail, chapterSettings, setChapterSettings, onError }) {
  const busy = status === 'next' || status === 'story';
  const hasIdea = !!(idea && idea.trim());
  const pickSuggestion = (text) => setIdea(text.trim());
  const submit = () => {
    if (!hasIdea) { if (onError) onError(`Enter an idea for Chapter ${nextNumber} to enable generation.`); return; }
    if (busy) return;
    onGenerateNext([idea.trim(), detail.trim()].filter(Boolean).join('\n'));
  };
  return <div className="rounded-2xl border-2 border-dashed border-[#cdc7b8] bg-[#f7f4ec] p-5 sm:p-6">
    <p className="text-[12px] font-bold tracking-[0.16em] uppercase text-[#57654b]">Write Chapter {nextNumber}</p>
    <p className="text-sm text-[#847e70] mt-1">Paste an idea for this chapter, add any further description, and choose its genre and length. The Generate button unlocks once you've written an idea.</p>

    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      <GenrePicker value={chapterSettings.genre} onChange={v => setChapterSettings({ ...chapterSettings, genre: v })} />
      <ChapterLengthPicker mode={chapterSettings.lengthMode} onModeChange={v => setChapterSettings({ ...chapterSettings, lengthMode: v })} wordMin={chapterSettings.wordMin} wordMax={chapterSettings.wordMax} onRangeChange={(k, v) => setChapterSettings({ ...chapterSettings, [k === 'min' ? 'wordMin' : 'wordMax']: v })} />
    </div>

    <div className="mt-4">
      <label htmlFor="chapter-idea" className="block text-[11px] font-semibold tracking-wide text-[#8b887c] mb-1.5">Chapter {nextNumber} idea <span className="text-[#a34235]">*</span></label>
      <textarea id="chapter-idea" value={idea} onChange={e => setIdea(e.target.value)} disabled={busy} placeholder={nextNumber === 2 ? "e.g. Elias opens the letter and finds it is written in his own handwriting, dated fifty years from now…" : "e.g. The lighthouse turns visitors away as its keeper becomes obsessed with the letters…"} className="w-full min-h-[96px] resize-y rounded-xl border border-[#d7d0c3] bg-[#fffdf8] px-4 py-3 text-[15px] leading-relaxed text-[#22251f] placeholder:text-[#a7a094] focus:outline-none focus:ring-1 focus:ring-[#57654b]/40 disabled:opacity-60" />
    </div>

    <div className="mt-3">
      <label htmlFor="chapter-detail" className="block text-[11px] font-semibold tracking-wide text-[#8b887c] mb-1.5">What happens in this chapter — description (optional)</label>
      <textarea id="chapter-detail" value={detail} onChange={e => setDetail(e.target.value)} disabled={busy} placeholder="Add more detail: which characters appear, the tone, a key reveal, a scene you want to see…" className="w-full min-h-[72px] resize-y rounded-xl border border-[#d7d0c3] bg-[#fffdf8] px-4 py-3 text-[15px] leading-relaxed text-[#22251f] placeholder:text-[#a7a094] focus:outline-none focus:ring-1 focus:ring-[#57654b]/40 disabled:opacity-60" />
    </div>
    {suggestions.length > 0 && <div className="mt-3">
      <p className="text-[11px] text-[#8b887c] mb-1.5">Suggested directions — tap to fill the idea box and edit if you like:</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s, i) => <button key={i} type="button" onClick={() => pickSuggestion(s)} disabled={busy} className="text-xs text-left rounded-full border border-[#c5c0b2] bg-white text-[#3c4436] px-3 py-1.5 hover:bg-[#f4f1e9] disabled:opacity-60 max-w-full"><span className="line-clamp-2">{s}</span></button>)}
      </div>
    </div>}
    {busy && <p className="mt-4 inline-flex items-center gap-2 text-sm text-[#57654b]"><Loader2 size={15} className="animate-spin"/> Writing Chapter {nextNumber}…</p>}
    {status === 'summary' && <p className="mt-4 inline-flex items-center gap-2 text-sm text-[#718062]"><Loader2 size={15} className="animate-spin"/> Updating story memory…</p>}
    {status === 'next' && <p className="mt-2 inline-flex items-center gap-2 text-sm text-[#718062]"><Loader2 size={15} className="animate-spin"/> Extending the chapter to hit the requested length…</p>}
    <div className="flex flex-col sm:flex-row gap-2 mt-4">
      <button type="button" onClick={submit} disabled={busy || !hasIdea} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#354834] text-white px-5 py-3 text-sm font-semibold hover:bg-[#253626] disabled:opacity-60 disabled:cursor-not-allowed"><Sparkles size={16}/> Generate Chapter {nextNumber}</button>
      <button type="button" onClick={onContinueAuto} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#c5c0b2] bg-white text-[#3c4436] px-5 py-3 text-sm font-semibold hover:bg-[#f4f1e9] disabled:opacity-60 disabled:cursor-not-allowed"><Play size={16}/> Continue automatically</button>
      <button type="button" onClick={onAddManual} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#c5c0b2] bg-white text-[#3c4436] px-5 py-3 text-sm font-semibold hover:bg-[#f4f1e9] disabled:opacity-60 disabled:cursor-not-allowed"><Plus size={16}/> Add chapter manually</button>
    </div>
  </div>;
}

export default function StoryReader({ book, status, error, suggestions, saving, coverStatus, illustratingChapters, chapterSettings, setChapterSettings, onRegen, onDelete, onEdit, onAddAfter, onAddManual, onGenerateNext, onContinueAuto, onSaveStory }) {
  const [idea, setIdea] = useState('');
  const [detail, setDetail] = useState('');
  const [composerNote, setComposerNote] = useState('');
  const [title, setTitle] = useState(book.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [autoEdit, setAutoEdit] = useState({ index: -1, nonce: 0 });
  const chapters = book.chapters || [];
  const nextNumber = chapters.length + 1;
  useEffect(() => {
    setIdea(''); setDetail(''); setComposerNote(''); setAutoEdit({ index: -1, nonce: 0 }); setTitle(book.title); setEditingTitle(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id]);

  const handleAddManual = () => {
    onAddManual();
    setAutoEdit({ index: chapters.length, nonce: autoEdit.nonce + 1 });
    setIdea(''); setDetail(''); setComposerNote('');
  };

  const handleGenerateNext = (combined) => {
    setComposerNote('');
    onGenerateNext(combined);
  };

  return <div className="space-y-8">
    <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
      <CoverImage src={book.cover_url} alt={`Cover for ${book.title}`} painting={coverStatus === 'painting'} className="w-32 sm:w-40 shrink-0" />
      <div className="min-w-0 flex-1">
      <span className="text-[11px] uppercase font-bold tracking-[0.22em] text-[#718062]">Your story</span>
      {editingTitle
        ? <div className="mt-2 flex flex-wrap items-center gap-2">
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full max-w-md rounded-lg border border-[#d7d0c3] bg-white px-3 py-2 font-serif text-3xl text-[#273228] focus:outline-none focus:ring-1 focus:ring-[#57654b]/40" />
            <button type="button" onClick={() => { onSaveStory(title); setEditingTitle(false); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#354834] text-white px-4 py-2 text-sm font-semibold hover:bg-[#253626]"><Check size={15}/> Save</button>
            <button type="button" onClick={() => { setTitle(book.title); setEditingTitle(false); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#eeeae0] text-[#586252] px-4 py-2 text-sm font-semibold hover:bg-[#e0e5d7]"><X size={15}/> Cancel</button>
          </div>
        : <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-[#273228] mt-2 inline-flex items-center gap-3 flex-wrap">{book.title}
            <button type="button" onClick={() => setEditingTitle(true)} title="Edit title" className="text-[#a7a094] hover:text-[#57654b]"><PenLine size={16}/></button>
          </h2>}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#777b70]">
        <span>{chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'}</span>
        {book.perspective && book.perspective !== 'Auto' && <><span className="text-[#c9c5b8]">·</span><span>{book.perspective}</span></>}
        {book.audience && book.audience !== 'Auto' && <><span className="text-[#c9c5b8]">·</span><span>{book.audience}</span></>}
        {book.language && book.language !== 'Auto' && <><span className="text-[#c9c5b8]">·</span><span>{book.language}</span></>}
        {book.setting && book.setting !== 'Auto' && <><span className="text-[#c9c5b8]">·</span><span className="line-clamp-1 max-w-[220px]">{book.setting}</span></>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => onSaveStory(book.title)} disabled={saving} className="inline-flex items-center gap-1.5 rounded-full bg-[#354834] text-white px-4 py-2 text-xs font-semibold hover:bg-[#253626] disabled:opacity-60"><Save size={14}/> Save story</button>
        {book.id && <span className="inline-flex items-center gap-1.5 text-xs text-[#718062]"><Check size={14}/> Saved to My Stories</span>}
      </div>
      </div>
    </div>

    <div className="space-y-6">
      {chapters.map((chapter, i) => <ChapterBlock key={`${i}-${autoEdit.index === i ? autoEdit.nonce : 0}`} chapter={chapter} index={i} status={status} defaultEditing={autoEdit.index === i} onEdit={onEdit} onRegen={onRegen} onDelete={onDelete} onAddAfter={onAddAfter} illustrating={!!illustratingChapters?.[i]} />)}
    </div>

    {error && <p role="alert" className="text-sm text-[#a34235] bg-[#f9eee9] rounded-xl p-3">{error}</p>}

    <ChapterComposer nextNumber={nextNumber} suggestions={suggestions} onGenerateNext={handleGenerateNext} onContinueAuto={onContinueAuto} onAddManual={handleAddManual} status={status} idea={idea} setIdea={setIdea} detail={detail} setDetail={setDetail} chapterSettings={chapterSettings} setChapterSettings={setChapterSettings} onError={setComposerNote} />
    {composerNote && <p role="alert" className="text-sm text-[#a34235] bg-[#f9eee9] rounded-xl p-3">{composerNote}</p>}
  </div>;
}