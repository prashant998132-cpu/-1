const KEY = 'jarvis_relationship';

export interface RelationshipData {
  totalInteractions: number;
  level: 1 | 2 | 3 | 4 | 5;
  firstMet: number;
  lastSeen: number;
}

export const LEVEL_CONFIG = {
  1: { name: 'Stranger',     emoji: '👋', greeting: 'Hello! Main JARVIS hoon. Kya karna hai?' },
  2: { name: 'Acquaintance', emoji: '🤝', greeting: 'Wapas aaye! Kya karna hai aaj?' },
  3: { name: 'Friend',       emoji: '😊', greeting: 'Aye! Kya scene hai aaj?' },
  4: { name: 'Best Friend',  emoji: '🔥', greeting: 'AAYO! Aaj kya banaoge?' },
  5: { name: 'JARVIS Mode',  emoji: '🤖', greeting: '...' },
};

function safeGet(): RelationshipData {
  try {
    const item = localStorage.getItem(KEY);
    return item ? JSON.parse(item) : { totalInteractions: 0, level: 1, firstMet: Date.now(), lastSeen: Date.now() };
  } catch { return { totalInteractions: 0, level: 1, firstMet: Date.now(), lastSeen: Date.now() }; }
}

function calcLevel(count: number): 1|2|3|4|5 {
  if (count >= 50) return 5;
  if (count >= 20) return 4;
  if (count >= 10) return 3;
  if (count >= 3)  return 2;
  return 1;
}

export const relationship = {
  get(): RelationshipData { return safeGet(); },

  recordInteraction(): { data: RelationshipData; leveledUp: boolean } {
    const data = safeGet();
    const oldLevel = data.level;
    data.totalInteractions++;
    data.lastSeen = Date.now();
    data.level = calcLevel(data.totalInteractions);
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
    return { data, leveledUp: data.level > oldLevel };
  },

  getGreeting(): string {
    const data = safeGet();
    return LEVEL_CONFIG[data.level].greeting;
  },
};
