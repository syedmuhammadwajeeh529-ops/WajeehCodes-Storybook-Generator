// Central, configurable sources of truth for story-level and chapter-level options.
// Changing these values updates the entire app (selectors, prompts, validation).

// Chapter length presets: word count RANGES for a single chapter, not the whole story.
export const CHAPTER_RANGES = {
  Short: [300, 600],
  Medium: [600, 1200],
  Long: [1200, 2200]
};

export const LENGTH_OPTIONS = ['Short', 'Medium', 'Long', 'Custom'];

// Story-level options persisted with the book.
export const PERSPECTIVES = ['Auto', 'First person', 'Second person', 'Third person limited', 'Third person omniscient'];
export const AUDIENCES = ['Auto', 'Children', 'Young adult', 'Adult', 'All ages'];
export const FORMATS = ['Auto', 'Novel', 'Serialized chapters', 'Short story collection', 'Episodic'];
export const LANGUAGES = ['Auto', 'English', 'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Arabic', 'Hindi', 'Japanese'];

// Chapter-level genre options. The default 'Auto' lets the AI pick a fitting genre.
export const GENRES = ['Auto', 'Fantasy', 'Adventure', 'Mystery', 'Science Fiction', 'Comedy', 'Horror', 'Historical', 'Drama', 'Romance', 'Thriller', 'Custom'];

// Clamp to a sane bound when a generated chapter wildly overshoots; avoids truncation for normal cases.
export const ABSOLUTE_MAX_WORDS = 6000;

// A human label for a chapter's length setting, for display.
export function lengthLabel(mode, wordMin, wordMax) {
  if (mode === 'Custom') {
    const min = Number(wordMin) || 0;
    const max = Number(wordMax) > min ? Number(wordMax) : null;
    return max ? `${min.toLocaleString()}–${max.toLocaleString()} words` : `${min.toLocaleString()}+ words`;
  }
  const preset = CHAPTER_RANGES[mode] || CHAPTER_RANGES.Short;
  return `${preset[0].toLocaleString()}–${preset[1].toLocaleString()} words`;
}