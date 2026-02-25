export interface ChatMessage {
  id: string;
  role: 'user' | 'jarvis';
  content: string;
  timestamp: number;
  intent?: string;
  toolUsed?: string;
  toolUrl?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface LinkPreference {
  linkId: string;
  usageCount: number;
  lastUsed: number;
  isFavorite: boolean;
  isHidden: boolean;
  customPosition?: number;
  personalRating?: number;
}

export interface JARVISPreferences {
  theme: 'dark' | 'light';
  language: 'en' | 'hi' | 'auto';
  voiceEnabled: boolean;
  autoExecute: boolean;
  showConfidence: boolean;
  fontSize: 'small' | 'medium' | 'large';
  defaultCategory: string;
  ttsEnabled: boolean;
  showMode: boolean;
}

const KEYS = {
  CHATS: 'jarvis_chats',
  ACTIVE_CHAT: 'jarvis_active_chat',
  LINK_PREFS: 'jarvis_link_prefs',
  PREFERENCES: 'jarvis_preferences',
  OWNER_ANALYTICS: 'jarvis_owner_analytics',
  RELATIONSHIP: 'jarvis_relationship',
  USER_PROFILE: 'jarvis_user_profile',
} as const;

function safeGet<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback;
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[JARVIS Memory] Storage failed:', e);
  }
}

export const chatMemory = {
  getAllSessions(): ChatSession[] {
    return safeGet<ChatSession[]>(KEYS.CHATS, []);
  },

  getSession(id: string): ChatSession | null {
    const sessions = this.getAllSessions();
    return sessions.find(s => s.id === id) || null;
  },

  createSession(title?: string): ChatSession {
    const session: ChatSession = {
      id: `chat_${Date.now()}`,
      title: title || 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const sessions = this.getAllSessions();
    sessions.unshift(session);
    safeSet(KEYS.CHATS, sessions);
    safeSet(KEYS.ACTIVE_CHAT, session.id);
    return session;
  },

  addMessage(sessionId: string, message: Omit<ChatMessage, 'id'>): ChatMessage {
    const msg: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    };
    const sessions = this.getAllSessions();
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx >= 0) {
      sessions[idx].messages.push(msg);
      sessions[idx].updatedAt = Date.now();
      if (sessions[idx].title === 'New Chat' && message.role === 'user') {
        sessions[idx].title = message.content.slice(0, 40) + (message.content.length > 40 ? '...' : '');
      }
      safeSet(KEYS.CHATS, sessions);
    }
    return msg;
  },

  deleteSession(id: string): void {
    const sessions = this.getAllSessions().filter(s => s.id !== id);
    safeSet(KEYS.CHATS, sessions);
  },

  getActiveSessionId(): string | null {
    return safeGet<string | null>(KEYS.ACTIVE_CHAT, null);
  },

  setActiveSession(id: string): void {
    safeSet(KEYS.ACTIVE_CHAT, id);
  },

  clearAll(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(KEYS.CHATS);
    localStorage.removeItem(KEYS.ACTIVE_CHAT);
  },
};

export const linkMemory = {
  getAll(): Record<string, LinkPreference> {
    return safeGet(KEYS.LINK_PREFS, {});
  },

  get(linkId: string): LinkPreference {
    const all = this.getAll();
    return all[linkId] || { linkId, usageCount: 0, lastUsed: 0, isFavorite: false, isHidden: false };
  },

  recordUsage(linkId: string): void {
    const all = this.getAll();
    const pref = all[linkId] || { linkId, usageCount: 0, lastUsed: 0, isFavorite: false, isHidden: false };
    all[linkId] = { ...pref, usageCount: pref.usageCount + 1, lastUsed: Date.now() };
    safeSet(KEYS.LINK_PREFS, all);
    ownerAnalytics.recordLinkClick(linkId);
  },

  toggleFavorite(linkId: string): boolean {
    const all = this.getAll();
    const pref = this.get(linkId);
    all[linkId] = { ...pref, isFavorite: !pref.isFavorite };
    safeSet(KEYS.LINK_PREFS, all);
    return all[linkId].isFavorite;
  },

  toggleHidden(linkId: string): boolean {
    const all = this.getAll();
    const pref = this.get(linkId);
    all[linkId] = { ...pref, isHidden: !pref.isHidden };
    safeSet(KEYS.LINK_PREFS, all);
    return all[linkId].isHidden;
  },

  sortByPopularity(linkIds: string[]): string[] {
    const prefs = this.getAll();
    return [...linkIds].sort((a, b) => {
      return (prefs[b]?.usageCount || 0) - (prefs[a]?.usageCount || 0);
    });
  },

  getFavorites(): string[] {
    const all = this.getAll();
    return Object.values(all).filter(p => p.isFavorite).map(p => p.linkId);
  },
};

const DEFAULT_PREFERENCES: JARVISPreferences = {
  theme: 'dark',
  language: 'auto',
  voiceEnabled: true,
  autoExecute: false,
  showConfidence: false,
  fontSize: 'medium',
  defaultCategory: 'all',
  ttsEnabled: false,
  showMode: true,
};

export const prefsMemory = {
  get(): JARVISPreferences {
    return { ...DEFAULT_PREFERENCES, ...safeGet(KEYS.PREFERENCES, {}) };
  },
  set(prefs: Partial<JARVISPreferences>): void {
    safeSet(KEYS.PREFERENCES, { ...this.get(), ...prefs });
  },
  reset(): void {
    safeSet(KEYS.PREFERENCES, DEFAULT_PREFERENCES);
  },
};

interface OwnerAnalytics {
  linkClicks: Record<string, number>;
  categoryUsage: Record<string, number>;
  sessionCount: number;
  totalMessages: number;
  errorCount: number;
  lastUpdated: number;
}

const DEFAULT_ANALYTICS: OwnerAnalytics = {
  linkClicks: {}, categoryUsage: {}, sessionCount: 0,
  totalMessages: 0, errorCount: 0, lastUpdated: Date.now(),
};

export const ownerAnalytics = {
  get(): OwnerAnalytics {
    return safeGet(KEYS.OWNER_ANALYTICS, DEFAULT_ANALYTICS);
  },
  recordLinkClick(linkId: string): void {
    const a = this.get();
    a.linkClicks[linkId] = (a.linkClicks[linkId] || 0) + 1;
    a.lastUpdated = Date.now();
    safeSet(KEYS.OWNER_ANALYTICS, a);
  },
  recordCategoryUsage(category: string): void {
    const a = this.get();
    a.categoryUsage[category] = (a.categoryUsage[category] || 0) + 1;
    a.lastUpdated = Date.now();
    safeSet(KEYS.OWNER_ANALYTICS, a);
  },
  recordMessage(): void {
    const a = this.get();
    a.totalMessages++;
    a.lastUpdated = Date.now();
    safeSet(KEYS.OWNER_ANALYTICS, a);
  },
  recordError(): void {
    const a = this.get();
    a.errorCount++;
    a.lastUpdated = Date.now();
    safeSet(KEYS.OWNER_ANALYTICS, a);
  },
  getTopLinks(n = 10): Array<{ linkId: string; clicks: number }> {
    return Object.entries(this.get().linkClicks)
      .map(([linkId, clicks]) => ({ linkId, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, n);
  },
  reset(): void {
    safeSet(KEYS.OWNER_ANALYTICS, DEFAULT_ANALYTICS);
  },
};
