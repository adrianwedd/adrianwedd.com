import { describe, it, expect } from 'vitest';
import { classifyComment, type CommentClassification } from '../classify';

describe('classifyComment', () => {
  it('classifies crisis messages (highest priority)', () => {
    expect(classifyComment("I can't cope anymore")).toBe('crisis');
    expect(classifyComment("I want to die")).toBe('crisis');
    expect(classifyComment("thinking about self-harm")).toBe('crisis');
    expect(classifyComment("I don't want to exist")).toBe('crisis');
  });

  it('classifies negative messages', () => {
    expect(classifyComment("This is garbage")).toBe('negative');
    expect(classifyComment("You're wrong and irresponsible")).toBe('negative');
  });

  it('classifies spam', () => {
    expect(classifyComment("Check my profile for free gifts")).toBe('spam');
    expect(classifyComment("Great crypto investment opportunity here")).toBe('spam');
    expect(classifyComment("Visit https://scamsite.com now")).toBe('spam');
  });

  it('classifies professional inquiries', () => {
    expect(classifyComment("I'd like to hire you for consulting")).toBe('professional-inquiry');
    expect(classifyComment("What are your rates?")).toBe('professional-inquiry');
    expect(classifyComment("Can I work with you on a project?")).toBe('professional-inquiry');
    expect(classifyComment("How do I get in touch?")).toBe('professional-inquiry');
  });

  it('does not match "contact" alone (false positive risk)', () => {
    expect(classifyComment("I lost my contact lens")).toBe('unclassified');
  });

  it('crisis takes priority over other matches', () => {
    expect(classifyComment("I can't cope, this is garbage, DM me")).toBe('crisis');
  });

  it('multi-match (non-crisis) flags for review', () => {
    expect(classifyComment("This is garbage, check my profile")).toBe('multi-match');
  });

  it('returns unclassified for neutral messages', () => {
    expect(classifyComment("Great article!")).toBe('unclassified');
    expect(classifyComment("Thanks for sharing")).toBe('unclassified');
  });
});
