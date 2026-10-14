import { en } from '../../localization/en';
import { hi } from '../../localization/hi';

describe('Bilingual Localization Completeness (English & Hindi)', () => {
  test('all English keys must have a corresponding Hindi translation', () => {
    const enKeys = Object.keys(en) as (keyof typeof en)[];
    const missingInHi: string[] = [];

    for (const key of enKeys) {
      if (!hi[key] || hi[key].trim().length === 0) {
        missingInHi.push(key);
      }
    }

    expect(missingInHi).toEqual([]);
  });

  test('key app names and business identity are accurately translated', () => {
    expect(hi.appName).toContain('NeerOS');
    expect(hi.initialBusiness).toBe('पाटिल ब्रदर्स');
    expect(hi.tagline).toBe('हर बूँद। हर डिलीवरी। हर विवरण।');
  });

  test('all payment methods have Hindi translations', () => {
    expect(hi.methodCash).toContain('नकद');
    expect(hi.methodUPI).toContain('यूपीआई');
    expect(hi.methodBank).toContain('बैंक');
    expect(hi.methodCheque).toContain('चेक');
  });
});
