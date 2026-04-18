import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist the prisma mock so vi.mock's factory doesn't touch uninit'd vars.
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    systemAgent: { findUnique: vi.fn() },
  },
}));

vi.mock('../lib/db', () => ({ prisma: prismaMock }));

import {
  getSystemAgent,
  scopeToolsToAgent,
  composeSystemPrompt,
} from '../lib/agents/system-agent';

beforeEach(() => {
  prismaMock.systemAgent.findUnique.mockReset();
});

describe('getSystemAgent', () => {
  it('returns null when no agent row exists', async () => {
    prismaMock.systemAgent.findUnique.mockResolvedValue(null);
    expect(await getSystemAgent('sys_123')).toBeNull();
  });

  it('parses the JSON tool allow-list', async () => {
    prismaMock.systemAgent.findUnique.mockResolvedValue({
      id: 'a1',
      systemId: 'sys_123',
      name: 'MarketingAgent',
      persona: 'You run the marketing function.',
      toolAllowList: '["send_email", "draft_post"]',
      autonomyTier: 'Act',
    });
    const agent = await getSystemAgent('sys_123');
    expect(agent?.toolAllowList).toEqual(['send_email', 'draft_post']);
    expect(agent?.autonomyTier).toBe('Act');
  });

  it('degrades to empty tool list on malformed JSON', async () => {
    prismaMock.systemAgent.findUnique.mockResolvedValue({
      id: 'a1',
      systemId: 'sys_123',
      name: 'Broken',
      persona: 'x',
      toolAllowList: '{not json',
      autonomyTier: 'Suggest',
    });
    const agent = await getSystemAgent('sys_123');
    expect(agent?.toolAllowList).toEqual([]);
  });

  it('coerces unknown autonomy tier to "Suggest"', async () => {
    prismaMock.systemAgent.findUnique.mockResolvedValue({
      id: 'a1',
      systemId: 'sys_123',
      name: 'x',
      persona: 'x',
      toolAllowList: '[]',
      autonomyTier: 'MoreThanAutonomous',
    });
    expect((await getSystemAgent('sys_123'))?.autonomyTier).toBe('Suggest');
  });
});

describe('scopeToolsToAgent', () => {
  it('no agent = passthrough', () => {
    expect(scopeToolsToAgent(['a', 'b'], null)).toEqual(['a', 'b']);
    expect(scopeToolsToAgent(undefined, null)).toBeUndefined();
  });

  it('intersects requested with allow-list', () => {
    const agent = {
      id: 'x',
      systemId: 'y',
      name: '',
      persona: '',
      toolAllowList: ['a', 'c'],
      autonomyTier: 'Suggest' as const,
    };
    expect(scopeToolsToAgent(['a', 'b', 'c'], agent)).toEqual(['a', 'c']);
  });

  it('no requested = full allow-list', () => {
    const agent = {
      id: 'x',
      systemId: 'y',
      name: '',
      persona: '',
      toolAllowList: ['only_one'],
      autonomyTier: 'Observe' as const,
    };
    expect(scopeToolsToAgent(undefined, agent)).toEqual(['only_one']);
  });
});

describe('composeSystemPrompt', () => {
  it('passthrough when no agent', () => {
    expect(composeSystemPrompt('do the thing', null)).toBe('do the thing');
  });

  it('prepends agent persona + autonomy tier', () => {
    const agent = {
      id: 'x',
      systemId: 'y',
      name: 'MarketingAgent',
      persona: 'You craft brand-aligned campaigns.',
      toolAllowList: [],
      autonomyTier: 'Suggest' as const,
    };
    const composed = composeSystemPrompt('draft a post', agent);
    expect(composed).toMatch(/MarketingAgent/);
    expect(composed).toMatch(/brand-aligned campaigns/);
    expect(composed).toMatch(/Autonomy tier: Suggest/);
    expect(composed).toMatch(/draft a post/);
    // Task comes AFTER the persona so the model reads "you are X, now do Y"
    expect(composed.indexOf('MarketingAgent')).toBeLessThan(composed.indexOf('draft a post'));
  });
});
