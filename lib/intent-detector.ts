// lib/intent-detector.ts
import { JARVIS_LINKS } from './links';

export interface IntentResult {
  intent: string;
  category: string;
  confidence: number;
  keywords: string[];
  mode: string;
  suggestedToolIds: string[];
  fallbackUsed: boolean;
}

const KEYWORD_MAP: Record<string, string[]> = {
  image: ['photo', 'image', 'picture', 'draw', 'generate', 'art', 'paint', 'logo', 'design', 'poster', 'banner', 'thumbnail', 'background', 'remove', 'upscale', 'edit', 'filter', 'sketch', 'portrait', 'landscape', 'illustration', 'icon', 'avatar', 'anime', 'manga', 'comic', '3d', 'render'],
  video: ['video', 'movie', 'film', 'clip', 'animation', 'motion', 'youtube', 'tiktok', 'reel', 'short', 'edit', 'cut', 'trim', 'merge', 'transition', 'vfx', 'cgi'],
  writing: ['write', 'text', 'article', 'blog', 'essay', 'story', 'poem', 'script', 'email', 'letter', 'resume', 'cv', 'summary', 'translate', 'grammar', 'spell', 'check', 'editor', 'proofread', 'copy', 'content'],
  code: ['code', 'program', 'develop', 'software', 'app', 'web', 'mobile', 'desktop', 'script', 'automation', 'api', 'database', 'server', 'cloud', 'devops', 'security', 'react', 'next', 'typescript', 'javascript', 'python', 'java', 'cpp', 'html', 'css'],
  audio: ['audio', 'sound', 'music', 'voice', 'speech', 'narration', 'podcast', 'song', 'track', 'album', 'tts', 'stt', 'transcription'],
  productivity: ['productivity', 'schedule', 'plan', 'organize', 'manage', 'task', 'project', 'workflow', 'note', 'document', 'spreadsheet', 'presentation', 'slide', 'deck', 'pitch'],
  design: ['design', 'ui', 'ux', 'interface', 'experience', 'layout', 'grid', 'color', 'palette', 'gradient', 'font', 'typography', 'vector', 'raster', 'pixel'],
};

export async function detectIntentWithRateLimit(input: string): Promise<IntentResult> {
  const lowerInput = input.toLowerCase();
  let detectedCategory = 'chat';
  let matchedKeywords: string[] = [];

  for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
    const matches = keywords.filter(kw => lowerInput.includes(kw));
    if (matches.length > matchedKeywords.length) {
      detectedCategory = category;
      matchedKeywords = matches;
    }
  }

  // Find tools that match keywords or category
  const suggestedToolIds = JARVIS_LINKS
    .filter(link => 
      link.category === detectedCategory || 
      link.tags.some(tag => matchedKeywords.includes(tag.toLowerCase())) ||
      matchedKeywords.some(kw => link.name.toLowerCase().includes(kw))
    )
    .slice(0, 3)
    .map(link => link.id);

  // Try to call the API, but fallback to keyword matching if it fails
  try {
    const response = await fetch('/api/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        ...data,
        suggestedToolIds: data.suggestedToolIds || suggestedToolIds,
        fallbackUsed: false,
      };
    }
  } catch (e) {
    console.warn('Intent API failed, using fallback', e);
  }

  return {
    intent: `User is asking about ${detectedCategory}`,
    category: detectedCategory,
    confidence: 0.5,
    keywords: matchedKeywords,
    mode: 'tool-finder',
    suggestedToolIds,
    fallbackUsed: true,
  };
}
