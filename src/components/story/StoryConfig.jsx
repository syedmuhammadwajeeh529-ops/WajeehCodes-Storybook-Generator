import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GENRES, PERSPECTIVES, AUDIENCES, FORMATS, LANGUAGES, LENGTH_OPTIONS } from './storyOptions';

function Pick({ label, value, options, onChange }) {
  return <label className="block rounded-xl border border-[#ddd8cb] bg-[#faf8f2] px-3.5 py-2.5">
    <span className="block text-[11px] font-semibold tracking-wide text-[#8b887c] mb-1 capitalize">{label}</span>
    <Select value={value} onValueChange={onChange}><SelectTrigger className="h-auto w-full border-0 bg-transparent p-0 shadow-none text-sm font-semibold text-[#2c342b] focus:ring-0 focus:ring-offset-0 [&>span]:line-clamp-1"><SelectValue /></SelectTrigger><SelectContent>{options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
  </label>;
}

function TextInput({ label, hint, value, onChange, placeholder, type = 'text' }) {
  return <label className="block">
    <span className="block text-[11px] font-semibold tracking-wide text-[#8b887c] mb-1.5 capitalize">{label}</span>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-[#d7d0c3] bg-[#fffdf8] px-3.5 py-2.5 text-sm text-[#2c342b] placeholder:text-[#a7a094] focus:outline-none focus:ring-1 focus:ring-[#57654b]/40" />
    {hint && <span className="block mt-1 text-[11px] text-[#8b887c]">{hint}</span>}
  </label>;
}

// ---- Story-level settings ----

export function PerspectivePicker({ value, onChange }) {
  return <Pick label="Narrative perspective" value={value} options={PERSPECTIVES} onChange={onChange} />;
}

export function AudiencePicker({ value, onChange }) {
  return <Pick label="Audience" value={value} options={AUDIENCES} onChange={onChange} />;
}

export function FormatPicker({ value, onChange }) {
  return <Pick label="Story format" value={value} options={FORMATS} onChange={onChange} />;
}

export function LanguagePicker({ value, onChange }) {
  return <Pick label="Output language" value={value} options={LANGUAGES} onChange={onChange} />;
}

export function GenrePicker({ value, onChange }) {
  return <Pick label="Genre" value={value} options={GENRES} onChange={onChange} />;
}

// ---- Chapter-level length ----

export function ChapterLengthPicker({ mode, onModeChange, wordMin, wordMax, onRangeChange }) {
  return <div className="rounded-xl border border-[#ddd8cb] bg-[#faf8f2] px-3.5 py-2.5 space-y-2.5">
    <label className="block">
      <span className="block text-[11px] font-semibold tracking-wide text-[#8b887c] mb-1">Chapter length</span>
      <Select value={mode} onValueChange={onModeChange}><SelectTrigger className="h-auto w-full border-0 bg-transparent p-0 shadow-none text-sm font-semibold text-[#2c342b] focus:ring-0 focus:ring-offset-0"><SelectValue /></SelectTrigger><SelectContent>{LENGTH_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
    </label>
    {mode === 'Custom' && <div className="grid grid-cols-2 gap-2">
      <TextInput label="Min words" type="number" value={wordMin || ''} onChange={v => onRangeChange('min', v)} placeholder="e.g. 4000" />
      <TextInput label="Max words" type="number" value={wordMax || ''} onChange={v => onRangeChange('max', v)} placeholder="e.g. 5000" />
    </div>}
  </div>;
}

export function SettingInput({ value, onChange }) {
  return <TextInput
    label="Setting / World"
    hint="Where and when the story takes place — a magical kingdom, a futuristic city, a school, a distant planet…"
    value={value}
    onChange={onChange}
    placeholder="e.g. A port town under a permanent twilight sky, in a distant age of steam"
  />;
}

export function CharacterSection({ characters, onChange }) {
  const addCharacter = () => onChange([...characters, { name: '', role: '', personality: '', traits: '', description: '' }]);
  const update = (i, key, v) => onChange(characters.map((c, idx) => idx === i ? { ...c, [key]: v } : c));
  const remove = (i) => onChange(characters.filter((_, idx) => idx !== i));
  return <div className="rounded-xl border border-[#ddd8cb] bg-[#faf8f2] px-4 py-3.5">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold tracking-wide text-[#8b887c]">Characters</span>
      <button type="button" onClick={addCharacter} className="text-xs font-semibold text-[#57654b] hover:text-[#354834]">{characters.length === 0 ? 'Add a character' : '+ Add another'}</button>
    </div>
    {characters.length === 0 ? <p className="mt-2 text-[11px] text-[#8b887c]">Optional — add the people your story follows so they stay consistent throughout. Include descriptions, roles, traits and relationships.</p> :
      <div className="mt-3 space-y-3">
        {characters.map((c, i) => <div key={i} className="rounded-lg bg-white border border-[#e4e0d4] p-3">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-[#3c4436]">Character {i + 1}</span><button type="button" onClick={() => remove(i)} className="text-[11px] font-semibold text-[#a34235] hover:underline">Remove</button></div>
          <div className="grid sm:grid-cols-2 gap-2">
            <TextInput label="Name" value={c.name} onChange={v => update(i, 'name', v)} placeholder="e.g. Eira" />
            <TextInput label="Role" value={c.role} onChange={v => update(i, 'role', v)} placeholder="e.g. The lighthouse keeper" />
            <TextInput label="Personality" value={c.personality} onChange={v => update(i, 'personality', v)} placeholder="e.g. Quiet, stubborn, gentle" />
            <TextInput label="Key traits" value={c.traits} onChange={v => update(i, 'traits', v)} placeholder="e.g. Fearless, truthful" />
            <TextInput label="Relationships" value={c.relationships || ''} onChange={v => update(i, 'relationships', v)} placeholder="e.g. Eira's estranged sister" />
            <div className="sm:col-span-2"><TextInput label="Additional description (optional)" value={c.description} onChange={v => update(i, 'description', v)} placeholder="Anything else that defines them…" /></div>
          </div>
        </div>)}
      </div>}
  </div>;
}