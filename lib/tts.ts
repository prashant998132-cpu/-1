export const tts = {
  speak(text: string): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    this.stop();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  },

  stop(): void {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
  },

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  },
};
