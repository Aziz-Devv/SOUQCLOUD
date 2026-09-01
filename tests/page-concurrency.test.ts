import { describe, it, expect } from 'vitest';
import {
  SaveDraftSectionsSchema,
  ActivateThemeSchema,
  UpdateDesignTokensSchema,
} from '../src/lib/schemas/theme';

describe('Page Optimistic Concurrency & Theme Schemas', () => {
  it('validates a valid draft revision save payload', () => {
    const result = SaveDraftSectionsSchema.safeParse({
      pageId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
      storeId: '49b1f775-bf8a-5e1c-ce96-dde311652918',
      expectedVersion: 3,
      sections: [
        {
          id: 'sec_1',
          type: 'hero',
          settings: { heading: 'Updated Heading' },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects draft save payload with invalid expectedVersion', () => {
    const result = SaveDraftSectionsSchema.safeParse({
      pageId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
      storeId: '49b1f775-bf8a-5e1c-ce96-dde311652918',
      expectedVersion: 0, // Must be >= 1
      sections: [],
    });
    expect(result.success).toBe(false);
  });

  it('validates theme activation schema payload', () => {
    const result = ActivateThemeSchema.safeParse({
      themeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
      storeId: '49b1f775-bf8a-5e1c-ce96-dde311652918',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID in theme activation schema', () => {
    const result = ActivateThemeSchema.safeParse({
      themeId: 'not-a-uuid',
      storeId: '49b1f775-bf8a-5e1c-ce96-dde311652918',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID in update design tokens schema', () => {
    const result = UpdateDesignTokensSchema.safeParse({
      themeId: 'not-a-uuid',
      storeId: '49b1f775-bf8a-5e1c-ce96-dde311652918',
      tokens: {},
    });
    expect(result.success).toBe(false);
  });
});
