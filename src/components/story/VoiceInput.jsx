import { useState } from "react";

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

  const startListening = () => {
    if (disabled || listening) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;

      onChange(value ? `${value} ${spokenText}` : spokenText);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  return (
    <div className="relative w-full min-w-0">
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`block w-full box-border ${className} pr-16`}
      />

      <button
        type="button"
        onClick={startListening}
        disabled={disabled || listening}
        aria-label={listening ? "Listening" : "Speak"}
        title={listening ? "Listening..." : "Speak your idea"}
        className={`absolute right-4 bottom-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#354834] text-white text-lg shadow-lg transition-colors hover:bg-[#253626] disabled:cursor-not-allowed disabled:opacity-50 ${buttonClassName}`}
      >
        {listening ? "🔴" : "🎙️"}
      </button>
    </div>
  );
}