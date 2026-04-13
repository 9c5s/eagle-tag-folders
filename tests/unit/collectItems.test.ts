import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { mockEagle } from '../helpers/mockEagle';
import { collectItems } from '@/modules/tagFolderSync/collectItems';

beforeEach(() => {
  mockEagle({
    item: {
      getAll: vi.fn(),
      getSelected: vi.fn(),
      get: vi.fn().mockResolvedValue([
        { id: 'i1', name: 'a', ext: 'png', filePath: '/src/a.png', tags: ['sky'] },
        { id: 'i2', name: 'b', ext: 'png', filePath: '/src/b.png', tags: [] },
        { id: 'i3', name: 'c', ext: 'png', filePath: '/src/c.png', tags: ['draft'] }
      ]),
      getById: vi.fn(),
      getByIds: vi.fn()
    } as unknown as Eagle.EagleAPI['item'],
    tagGroup: {
      get: vi.fn().mockResolvedValue([]),
      create: vi.fn()
    } as unknown as Eagle.EagleAPI['tagGroup']
  });
});

describe('collectItems', () => {
  it('タグ無しと除外タグ該当をフィルタ', async () => {
    const { items, excludedCount } = await collectItems(['draft']);
    expect(items).toHaveLength(1);
    expect(items[0]!.id).toBe('i1');
    expect(excludedCount).toBe(1);
  });
});
