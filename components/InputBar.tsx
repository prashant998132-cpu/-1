'use client';
// components/InputBar.tsx

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Mic, MicOff, Paperclip } from 'lucide-react';

interface Props {
  onSend: (message: string) => void;
  isDisabled?: boolean;
}

export default function InputBar({ onSend, isDisabled }: Props) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check voice support
    setVoiceSupported('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    }
  }, [input]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isDisabled) return;
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function toggleVoice() {
    if (!voiceSupported) return;

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN,en-IN,en-US'; // Hindi + English
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(r => r[0].transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }

  return (
    <div className="border-t border-[rgba(255,26,136,0.2)] bg-[#10102a] p-4">
      <div className="flex items-end gap-3 max-w-4xl mx-auto">

        {/* File upload (future) */}
        <button
          className="text-gray-500 hover:text-[#ff1a88] transition-colors pb-3 flex-shrink-0"
          title="Attach file (coming soon)"
        >
          <Paperclip size={20} />
        </button>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What do you want to create? (Type in Hindi or English)"
            disabled={isDisabled}
            rows={1}
            className="jarvis-input resize-none min-h-[44px] max-h-[120px] pr-12 text-sm disabled:opacity-50"
          />

          {/* Voice button inside input */}
          {voiceSupported && (
            <button
              onClick={toggleVoice}
              className={`absolute right-3 bottom-3 transition-colors
                ${isRecording ? 'text-red-400 animate-pulse' : 'text-gray-400 hover:text-[#ff1a88]'}`}
              title={isRecording ? 'Stop recording' : 'Voice input (Hindi + English)'}
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!input.trim() || isDisabled}
          className={`jarvis-btn flex items-center justify-center w-11 h-11 p-0 flex-shrink-0
            ${(!input.trim() || isDisabled) ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <Send size={18} />
        </button>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <p className="text-center text-xs text-red-400 mt-2 animate-pulse">
          🎙️ Recording... Speak in Hindi or English
        </p>
      )}

      <p className="text-center text-[10px] text-gray-600 mt-2">
        Enter to send • Shift+Enter for new line
      </p>
    </div>
  );
}
