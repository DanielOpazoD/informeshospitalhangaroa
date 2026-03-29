import { describe, expect, it } from 'vitest';
import { sanitizeClinicalHtml } from '../utils/clinicalContentSanitizer';

describe('sanitizeClinicalHtml', () => {
    it('preserva saltos de línea creados con div al editar contenido clínico', () => {
        const result = sanitizeClinicalHtml('<div>Primera línea</div><div>Segunda línea</div>');
        expect(result.html).toBe('<p>Primera línea</p><p>Segunda línea</p>');
    });
});
