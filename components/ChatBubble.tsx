'use client';
// components/ChatBubble.tsx

import { Zap, User } from 'lucide-react';
import { type ChatMessage } from '@/lib/memory';

interface Props {
  message: ChatMessage;
}

export default function ChatBubble({ message }: Props) {
  const isJarvis = message.role === 'jarvis';

  // Simple markdown-like parser
  function renderContent(text: string) {
    // Handle bold: **text**
    // Handle italic: _text_
    // Handle links: [text](url)
    
    let parts: (string | JSX.Element)[] = [text];

    // Bold
    parts = parts.flatMap(part => {
      if (typeof part !== 'string') return part;
      const subParts = part.split(/(\*\*[^*]+\*\*)/g);
      return subParts.map((sub, i) => {
        if (sub.startsWith('**') && sub.endsWith('**')) {
          return <strong key={`b-${i}`} className="text-[#ff1a88] font-semibold">{sub.slice(2, -2)}</strong>;
        }
        return sub;
      });
    });

    // Italic
    parts = parts.flatMap(part => {
      if (typeof part !== 'string') return part;
      const subParts = part.split(/(_[^*]+_)/g);
      return subParts.map((sub, i) => {
        if (sub.startsWith('_') && sub.endsWith('_')) {
          return <em key={`i-${i}`} className="text-gray-400 italic">{sub.slice(1, -1)}</em>;
        }
        return sub;
      });
    });

    // Links
    parts = parts.flatMap(part => {
      if (typeof part !== 'string') return part;
      const subParts = part.split(/(\[[^\]]+\]\([^)]+\))/g);
      return subParts.map((sub, i) => {
        const match = sub.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (match) {
          return (
            <a 
              key={`l-${i}`} 
              href={match[2]} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#ff1a88] underline hover:text-[#ff4da6] transition-colors"
            >
              {match[1]}
            </a>
          );
        }
        return sub;
      });
    });

    return parts;
  }

  return (
    <div className={`flex gap-3 message-in ${isJarvis ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center
        ${isJarvis
          ? 'bg-[rgba(255,26,136,0.2)] text-[#ff1a88]'
          : 'bg-[rgba(139,0,255,0.2)] text-purple-400'
        }`}
      >
        {isJarvis ? <Zap size={14} /> : <User size={14} />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed
        ${isJarvis
          ? 'bg-[#1a1a3c] border border-[rgba(255,26,136,0.15)] text-gray-200 rounded-tl-sm'
          : 'bg-[rgba(139,0,255,0.2)] text-white rounded-tr-sm'
        }`}
      >
        {message.content.split('\n').map((line, i) => (
          <p key={i} className={i > 0 ? 'mt-1' : ''}>
            {renderContent(line)}
          </p>
        ))}

        {/* Timestamp */}
        <p className="text-[10px] text-gray-500 mt-1 text-right">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
