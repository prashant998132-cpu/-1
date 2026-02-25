export type JARVISMode = 'tool-finder' | 'chat' | 'code' | 'translate' | 'summary';

const MODE_KEYWORDS: Record<JARVISMode, string[]> = {
  'tool-finder': ['tool', 'app', 'website', 'find', 'suggest', 'banana', 'chahiye', 'बनाना', 'चाहिए', 'dhundho', 'ढूंढो'],
  'code':        ['code', 'program', 'function', 'bug', 'script', 'html', 'css', 'javascript', 'python', 'कोड'],
  'translate':   ['translate', 'translation', 'meaning', 'anuvad', 'अनुवाद', 'matlab', 'मतलब'],
  'summary':     ['summarize', 'summary', 'short', 'brief', 'tldr', 'संक्षेप', 'short mein'],
  'chat':        ['what', 'how', 'why', 'explain', 'tell', 'kya', 'kaise', 'kyun', 'क्या', 'कैसे', 'क्यों', 'बताओ'],
};

export function detectMode(input: string): JARVISMode {
  const lower = input.toLowerCase();
  const scores: Record<JARVISMode, number> = {
    'tool-finder': 0, 'chat': 0, 'code': 0, 'translate': 0, 'summary': 0,
  };
  for (const [mode, keywords] of Object.entries(MODE_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) scores[mode as JARVISMode]++;
    }
  }
  let best: JARVISMode = 'tool-finder';
  let max = 0;
  for (const [mode, score] of Object.entries(scores)) {
    if (score > max) { max = score; best = mode as JARVISMode; }
  }
  return best;
}

export const MODE_LABELS: Record<JARVISMode, string> = {
  'tool-finder': '🔧 Tool Finder',
  'chat':        '💬 Chat',
  'code':        '💻 Code',
  'translate':   '🌐 Translate',
  'summary':     '📄 Summary',
};
