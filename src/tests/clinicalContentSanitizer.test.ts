import { describe, expect, it } from 'vitest';
import { sanitizeClinicalHtml } from '../utils/clinicalContentSanitizer';

describe('sanitizeClinicalHtml', () => {
    it('preserva saltos de línea creados con div al editar contenido clínico', () => {
        const result = sanitizeClinicalHtml('<div>Primera línea</div><div>Segunda línea</div>');
        expect(result.html).toBe('<p>Primera línea</p><p>Segunda línea</p>');
    });

    it('preserva blockquote para mantener sangría aplicada en el editor', () => {
        const result = sanitizeClinicalHtml('<blockquote><p>Texto con sangría</p></blockquote>');
        expect(result.html).toBe('<blockquote><p>Texto con sangría</p></blockquote>');
    });

    it('normaliza sangría inline a blockquote en bloques de texto', () => {
        const result = sanitizeClinicalHtml('<p style="margin-left: 48px">Texto con sangría inline</p>');
        expect(result.html).toBe('<blockquote><p>Texto con sangría inline</p></blockquote>');
    });

    it('permite solo estilos de sangría seguros dentro de listas', () => {
        const result = sanitizeClinicalHtml('<ul><li style="margin-left: 32px; position: fixed">Item</li></ul>');
        expect(result.html).toBe('<ul><li style="margin-left: 32px">Item</li></ul>');
    });

    it('elimina estilos no permitidos para evitar inyección', () => {
        const result = sanitizeClinicalHtml('<p style="background-image: url(javascript:alert(1)); color: red">Texto</p>');
        expect(result.html).toBe('<p>Texto</p>');
        expect(result.warnings).toContain('Se eliminaron estilos no permitidos del contenido clínico.');
    });
});
