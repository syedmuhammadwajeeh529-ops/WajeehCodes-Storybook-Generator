import { useState } from "react";

export default function VoiceInput({
  value,
  onChange,
  placeholder,
  id,
  className = ""
}) {
  const [listening, setListening] = useState(false);

  const startListening = () => {
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
    <div className="relative">
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${className} pr-14`}
      />

      <button
        type="button"
        onClick={startListening}
        aria-label={listening ? "Listening" : "Speak"}
        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#e5eadf] text-lg transition-colors hover:bg-[#d5ddcc]"
      >
        {listening ? "🔴" : "🎙️"}
      </button>
    </div>
  );
}