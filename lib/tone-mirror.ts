export type Tone = 'casual' | 'formal' | 'hinglish' | 'brief' | 'detailed';

export function detectTone(messages: Array<{role: string, content: string}>): Tone {
  const userMessages = messages
    .filter(m => m.role === 'user')
    .slice(-3)
    .map(m => m.content.toLowerCase());

  if (userMessages.length === 0) return 'casual';
  const combined = userMessages.join(' ');

  const hinglishWords = ['bhai', 'yaar', 'kal', 'aaj', 'mera', 'tera', 'kya', 'hai', 'nahi', 'haan'];
  const hinglishScore = hinglishWords.filter(w => combined.includes(w)).length;

  const formalWords = ['please', 'kindly', 'assist', 'require', 'would like', 'could you'];
  const formalScore = formalWords.filter(w => combined.includes(w)).length;

  const avgLen = userMessages.reduce((s, m) => s + m.length, 0) / userMessages.length;

  if (hinglishScore >= 2) return 'hinglish';
  if (formalScore >= 1) return 'formal';
  if (avgLen < 20) return 'brief';
  if (avgLen > 100) return 'detailed';
  return 'casual';
}

export function getTonePrefix(tone: Tone, level: number): string {
  if (level >= 4) return tone === 'hinglish' ? 'Bhai! ' : 'Aye! ';
  if (tone === 'hinglish') return 'Yaar, ';
  return '';
}
