import { useEffect, useRef, useState } from "react";

export default function VoiceInput({
  value,
  onChange,
  placeholder,
  id,
  className = "",
  buttonClassName = "",
  disabled = false
}) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const restartTimerRef = useRef(null);
  const latestValueRef = useRef(value);

  // Keep speech results in sync with text the user types while dictating.
  latestValueRef.current = value;

  const stopListening = () => {
    shouldListenRef.current = false;
    window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = null;

    const recognition = recognitionRef.current;
    recognitionRef.current = null;

    setListening(false);
    recognition?.stop();
  };

  const startRecognition = () => {
    if (!shouldListenRef.current || disabled) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      shouldListenRef.current = false;
      setListening(false);
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      const spokenText = Array.from(event.results)
        .slice(event.resultIndex)
        .filter((result) => result.isFinal)
        .map((result) => result[0].transcript.trim())
        .filter(Boolean)
        .join(" ");

      if (!spokenText) return;

      const currentText = latestValueRef.current || "";
      const nextValue = currentText
        ? `${currentText.trimEnd()} ${spokenText}`
        : spokenText;

      latestValueRef.current = nextValue;
      onChange(nextValue);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);

      // Permission and device errors cannot be fixed by restarting recognition.
      if (
        ["not-allowed", "service-not-allowed", "audio-capture"].includes(
          event.error
        )
      ) {
        shouldListenRef.current = false;
        setListening(false);
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }

      // Some browsers end a speech session after a long pause. Keep the
      // microphone session active until the user explicitly presses Stop.
      if (shouldListenRef.current && !disabled) {
        restartTimerRef.current = window.setTimeout(() => {
          restartTimerRef.current = null;
          startRecognition();
        }, 250);
      } else {
        setListening(false);
      }
    };

    try {
      recognition.start();
    } catch (error) {
      console.error("Could not start speech recognition:", error);
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      shouldListenRef.current = false;
      setListening(false);
    }
  };

  const toggleListening = () => {
    if (disabled) return;

    if (shouldListenRef.current) {
      stopListening();
      return;
    }

    shouldListenRef.current = true;
    startRecognition();
  };

  useEffect(() => {
    if (disabled && shouldListenRef.current) {
      stopListening();
    }

    return () => {
      shouldListenRef.current = false;
      window.clearTimeout(restartTimerRef.current);
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, [disabled]);

  return (
    <div className="relative w-full min-w-0">
      <textarea
        id={id}
        value={value}
        onChange={(event) => {
          latestValueRef.current = event.target.value;
          onChange(event.target.value);
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={`block w-full box-border ${className} pr-16`}
      />

      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        aria-label={listening ? "Stop listening" : "Start listening"}
        title={listening ? "Stop voice input" : "Speak your idea"}
        className={`absolute right-4 bottom-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#354834] text-white text-lg shadow-lg transition-colors hover:bg-[#253626] disabled:cursor-not-allowed disabled:opacity-50 ${buttonClassName}`}
      >
        {listening ? "⏹️" : "🎙️"}
      </button>
    </div>
  );
}
