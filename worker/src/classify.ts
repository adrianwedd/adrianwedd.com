export type CommentClassification =
  | 'crisis'
  | 'negative'
  | 'spam'
  | 'professional-inquiry'
  | 'positive'
  | 'personal'
  | 'multi-match'
  | 'unclassified';

const CRISIS_PATTERNS: RegExp[] = [
  /\b(suicide|suicidal|kill\s*(myself|themselves))\b/i,
  /\b(self[- ]?harm|hurt\s*(myself|themselves))\b/i,
  /\bcan'?t\s+(cope|go on|do this|take it|anymore)\b/i,
  /\b(end\s*(it|my life)|don'?t\s+want\s+to\s+(be here|live|exist))\b/i,
  /\b(want\s+to\s+(die|disappear)|no\s+point|give\s+up)\b/i,
  /\b(crisis|emergency)\b/i,
];

const NEGATIVE_PATTERNS: RegExp[] = [
  /\b(rubbish|garbage|waste|scam|terrible|awful|disgusting)\b/i,
  /\b(you'?re\s+wrong|dangerous|irresponsible|harmful)\b/i,
];

const SPAM_SIGNALS: RegExp[] = [
  /https?:\/\/(?!adrianwedd\.com)/i,
  /\b(DM\s+me|check\s+my\s+(profile|page|bio)|free\s+gift)\b/i,
  /\b(crypto|NFT|forex|investment\s+opportunity)\b/i,
];

const PROFESSIONAL_INQUIRY_PATTERNS: RegExp[] = [
  /\b(hire|hiring|consult|consulting|freelance)\b/i,
  /\b(work\s+with\s+you|collaborate|partnership)\b/i,
  /\b(services|rates?|availability|book\s+a\s+(call|meeting))\b/i,
  /\b(reach\s+you|get\s+in\s+touch)\b/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(text));
}

export function classifyComment(text: string): CommentClassification {
  if (matchesAny(text, CRISIS_PATTERNS)) return 'crisis';

  const matches: CommentClassification[] = [];
  if (matchesAny(text, NEGATIVE_PATTERNS)) matches.push('negative');
  if (matchesAny(text, SPAM_SIGNALS)) matches.push('spam');
  if (matchesAny(text, PROFESSIONAL_INQUIRY_PATTERNS)) matches.push('professional-inquiry');

  if (matches.length > 1) return 'multi-match';
  if (matches.length === 1) return matches[0];
  return 'unclassified';
}
