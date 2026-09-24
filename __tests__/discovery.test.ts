import { describe, it, expect, vi } from 'vitest';
import { DiscoveryEngine } from '../lib/discovery';

// Mock supabase client
vi.mock('../lib/supabase', () => ({
  getServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'mock-hypothesis-id', title: 'Inferred Match' },
            error: null
          })
        }))
      }))
    }))
  }))
}));

// Mock events logger
vi.mock('../lib/events', () => ({
  logEvent: vi.fn().mockResolvedValue({})
}));

describe('Discovery Engine', () => {
  it('should run basic scan and generate a hypothesis', async () => {
    const engine = new DiscoveryEngine();
    const results = await engine.runBasicScan();
    
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Inferred Match');
    expect(results[0].id).toBe('mock-hypothesis-id');
  });
});
