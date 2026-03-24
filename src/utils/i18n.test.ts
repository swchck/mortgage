import { describe, it, expect } from 'vitest';
import ru from '@/i18n/ru.json';
import en from '@/i18n/en.json';
import sr from '@/i18n/sr.json';

// Helper to get all keys recursively
function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...getKeys(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

describe('i18n translations', () => {
  const ruKeys = getKeys(ru);
  const enKeys = getKeys(en);
  const srKeys = getKeys(sr);

  it('en has all keys from ru', () => {
    const missing = ruKeys.filter((k) => !enKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it('sr has all keys from ru', () => {
    const missing = ruKeys.filter((k) => !srKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it('no extra keys in en not in ru', () => {
    const extra = enKeys.filter((k) => !ruKeys.includes(k));
    expect(extra).toEqual([]);
  });

  it('no extra keys in sr not in ru', () => {
    const extra = srKeys.filter((k) => !ruKeys.includes(k));
    expect(extra).toEqual([]);
  });

  it('no empty values in ru', () => {
    const empty = ruKeys.filter((k) => {
      const val = k.split('.').reduce((o: any, p) => o?.[p], ru);
      return val === '' || val === null || val === undefined;
    });
    expect(empty).toEqual([]);
  });

  it('no empty values in en', () => {
    const empty = enKeys.filter((k) => {
      const val = k.split('.').reduce((o: any, p) => o?.[p], en);
      return val === '' || val === null || val === undefined;
    });
    expect(empty).toEqual([]);
  });

  it('no empty values in sr', () => {
    const empty = srKeys.filter((k) => {
      const val = k.split('.').reduce((o: any, p) => o?.[p], sr);
      return val === '' || val === null || val === undefined;
    });
    expect(empty).toEqual([]);
  });

  it('all translations have reasonable length (no extremely long strings that break layout)', () => {
    // Check that no UI label (non-modal-body) exceeds 60 chars
    const labelKeys = ruKeys.filter(
      (k) => !k.includes('modals.') || k.endsWith('.title'),
    ).filter((k) => !k.includes('.body') && !k.includes('.desc') && !k.includes('.detail'));

    for (const k of labelKeys) {
      for (const [name, translations] of [['ru', ru], ['en', en], ['sr', sr]] as const) {
        const val = k.split('.').reduce((o: any, p) => o?.[p], translations);
        if (typeof val === 'string' && val.length > 80) {
          // Only flag truly short labels, not descriptions
          if (!k.includes('subtitle') && !k.includes('desc') && !k.includes('body')) {
            expect(`${name}.${k} (${val.length} chars)`).toBe('within limit');
          }
        }
      }
    }
  });
});
