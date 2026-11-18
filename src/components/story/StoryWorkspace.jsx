import React from 'react';
import { Sparkles as SparklesIcon } from 'lucide-react';
import IdeaPanel from './IdeaPanel';
import StoryReader from './StoryReader';

export default function StoryWorkspace(s) {
  // Give the new-story form the full available width.
  // Keep the two-column layout when an existing book is open.
  const workspaceClass = s.book
    ? 'grid lg:grid-cols-[minmax(320px,470px)_minmax(0,1fr)] gap-10 lg:gap-16 items-start'
    : 'grid grid-cols-1 gap-10 items-start';

  return (
    <section
      aria-label="Story workspace"
      className={workspaceClass}
    >
      <div className="space-y-6 min-w-0 w-full">
        {!s.book && (
          <>
            <div>
              <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] uppercase text-[#7864bd]">
                <SparklesIcon size={14} />
                The story starts here
              </span>

              <h1 className="font-serif text-4xl sm:text-5xl leading-[1.08] tracking-tight mt-4 text-[#28304b]">
                Every idea
                <br />
                <em className="font-normal text-[#7864bd]">
                  has a story.
                </em>
              </h1>

              <p className="text-[#6f7082] leading-relaxed mt-4 max-w-sm">
                Configure your characters, world and settings, then write
                your opening chapter.
              </p>
            </div>

            <IdeaPanel
              idea={s.idea}
              onIdeaChange={s.setIdea}
              config={s.config}
              setConfig={s.setConfig}
              characters={s.characters}
              setCharacters={s.setCharacters}
              setting={s.setting}
              setSetting={s.setSetting}
              chapterSettings={s.chapterSettings}
              setChapterSettings={s.setChapterSettings}
              status={s.status}
              error={s.error}
              onGenerate={s.generate}
            />
          </>
        )}

        {s.book && (
          <div className="mt-2">
            <p className="text-[#847e70] text-sm leading-relaxed">
              Continuing{' '}
              <span className="font-semibold text-[#3c4436]">
                {s.book.title}
              </span>
              . Use the composer below the chapters to guide the next one.
            </p>

            <button
              onClick={s.goToStart}
              className="mt-3 text-sm font-semibold text-[#66549e] hover:text-[#443576]"
            >
              ← Start page
            </button>
          </div>
        )}
      </div>

      <section
        id="story-reader"
        aria-label="Your story"
        className="min-w-0 w-full bg-[#fffdf8] rounded-[1.75rem] border border-[#e2deed] shadow-[0_15px_55px_rgba(66,57,90,0.06)] p-5 sm:p-9 lg:p-11 min-h-[620px]"
      >
        {s.book ? (
          <StoryReader
            {...s}
            onGenerateNext={s.generateNextChapter}
            onContinueAuto={s.continueAutomatically}
            onRegen={s.regenerateChapter}
            onDelete={s.deleteChapter}
            onEdit={s.saveChapterEdit}
            onAddAfter={(i) => s.addChapterAfter(i, 'manual')}
            onAddManual={() =>
              s.addChapterAfter(
                (s.book.chapters || []).length - 1,
                'manual'
              )
            }
            onSaveStory={s.saveStory}
          />
        ) : (
          <div className="min-h-[540px] flex flex-col items-center justify-center text-center px-4">
            <img
              src="/story-canvas-hero.svg"
              alt="An open storybook ready for your story"
              className="w-44 sm:w-52 h-auto drop-shadow-[0_16px_24px_rgba(87,72,150,0.14)]"
            />

            <p className="font-serif text-2xl mt-8 text-[#443b61]">
              A world waiting to be written
            </p>

            <p className="text-sm text-[#89839b] mt-2 max-w-xs">
              Your story and its chapters will appear here after you generate them.
            </p>
          </div>
        )}
      </section>
    </section>
  );
}
