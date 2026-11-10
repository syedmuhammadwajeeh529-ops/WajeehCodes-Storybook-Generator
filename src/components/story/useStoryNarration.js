
import { useCallback, useEffect, useRef, useState } from 'react';

export default function useStoryNarration() {
  const [playback, setPlayback] = useState({
    status: 'idle',
    mode: null,
    chapterIndex: null,
    error: ''
  });

  const runId = useRef(0);
  const mounted = useRef(false);

  const stop = useCallback(() => {
    // Invalidate any speech callbacks that are still pending.
    runId.current += 1;

    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window
    ) {
      window.speechSynthesis.cancel();
    }

    setPlayback({
      status: 'idle',
      mode: null,
      chapterIndex: null,
      error: ''
    });
  }, []);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      runId.current += 1;

      if (
        typeof window !== 'undefined' &&
        'speechSynthesis' in window
      ) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakSegments = useCallback(
    (segments, mode, chapterIndex = null) => {
      if (
        typeof window === 'undefined' ||
        !('speechSynthesis' in window) ||
        typeof window.SpeechSynthesisUtterance === 'undefined'
      ) {
        setPlayback({
          status: 'idle',
          mode: null,
          chapterIndex: null,
          error: 'Speech playback is not supported in this browser.'
        });
        return;
      }

      const cleanSegments = segments
        .map((segment) => String(segment || '').trim())
        .filter(Boolean);

      if (cleanSegments.length === 0) {
        setPlayback({
          status: 'idle',
          mode: null,
          chapterIndex: null,
          error: 'There is no text to read aloud.'
        });
        return;
      }

      const synthesis = window.speechSynthesis;
      const currentRun = ++runId.current;

      synthesis.cancel();

      setPlayback({
        status: 'playing',
        mode,
        chapterIndex,
        error: ''
      });

      let segmentIndex = 0;

      const speakNext = () => {
        if (
          currentRun !== runId.current ||
          !mounted.current
        ) {
          return;
        }

        if (segmentIndex >= cleanSegments.length) {
          setPlayback({
            status: 'idle',
            mode: null,
            chapterIndex: null,
            error: ''
          });
          return;
        }

        const utterance = new window.SpeechSynthesisUtterance(
          cleanSegments[segmentIndex]
        );

        utterance.onend = () => {
          if (currentRun !== runId.current) return;

          segmentIndex += 1;
          speakNext();
        };

        utterance.onerror = (event) => {
          if (currentRun !== runId.current) return;

          // Cancellation is intentional when another reading starts.
          if (event.error === 'canceled' || event.error === 'interrupted') {
            return;
          }

          setPlayback({
            status: 'idle',
            mode: null,
            chapterIndex: null,
            error: 'Speech playback encountered a problem. Please try again.'
          });
        };

        synthesis.speak(utterance);
      };

      speakNext();
    },
    []
  );

  const readChapter = useCallback(
    (chapter, index) => {
      const heading = chapter?.heading || `Chapter ${index + 1}`;
      const body = chapter?.body || '';

      speakSegments(
        [heading, body],
        'chapter',
        index
      );
    },
    [speakSegments]
  );

  const readStory = useCallback(
    (chapters) => {
      const segments = [];

      chapters.forEach((chapter, index) => {
        segments.push(
          chapter?.heading || `Chapter ${index + 1}`
        );

        segments.push(chapter?.body || '');
      });

      speakSegments(segments, 'story');
    },
    [speakSegments]
  );

  const pause = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      window.speechSynthesis.speaking
    ) {
      window.speechSynthesis.pause();

      setPlayback((current) => ({
        ...current,
        status: 'paused'
      }));
    }
  }, []);

  const resume = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window
    ) {
      window.speechSynthesis.resume();

      setPlayback((current) => {
        if (current.status !== 'paused') return current;

        return {
          ...current,
          status: 'playing'
        };
      });
    }
  }, []);

  return {
    playback,
    readChapter,
    readStory,
    pause,
    resume,
    stop
  };
}
