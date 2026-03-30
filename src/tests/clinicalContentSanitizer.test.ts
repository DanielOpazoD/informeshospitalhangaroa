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

    // ── XSS vectors ────────────────────────────────────────────────────────
    it('elimina etiquetas <script> completas', () => {
        const result = sanitizeClinicalHtml('<p>Hola</p><script>alert("xss")</script>');
        expect(result.html).not.toContain('<script>');
        expect(result.html).not.toContain('alert');
        expect(result.html).toContain('Hola');
    });

    it('elimina atributos de evento inline (onclick, onerror, etc.)', () => {
        const result = sanitizeClinicalHtml('<p onclick="alert(1)" onerror="steal()">Texto</p>');
        expect(result.html).not.toContain('onclick');
        expect(result.html).not.toContain('onerror');
        expect(result.html).toContain('Texto');
    });

    it('elimina href con protocolo javascript:', () => {
        const result = sanitizeClinicalHtml('<a href="javascript:alert(1)">clic</a>');
        expect(result.html).not.toContain('javascript:');
    });

    it('elimina etiquetas no permitidas manteniendo su contenido de texto', () => {
        const result = sanitizeClinicalHtml('<div><iframe src="evil.com"></iframe>Texto seguro</div>');
        expect(result.html).not.toContain('<iframe');
        expect(result.html).not.toContain('evil.com');
        expect(result.html).toContain('Texto seguro');
    });

    it('elimina atributo style con expression() para IE', () => {
        const result = sanitizeClinicalHtml('<p style="width: expression(alert(1))">Texto</p>');
        expect(result.html).not.toContain('expression(');
        expect(result.html).toContain('Texto');
    });

    it('elimina atributo style con url() no-imagen para prevenir CSRF/tracking', () => {
        const result = sanitizeClinicalHtml('<p style="background: url(http://evil.com/track.gif)">Texto</p>');
        expect(result.html).not.toContain('background');
        expect(result.html).toContain('Texto');
    });

    // ── Table support ────────────────────────────────────────────────────────
    it('preserva tablas con estructura válida', () => {
        const html = '<table><thead><tr><th>Cabecera</th></tr></thead><tbody><tr><td>Celda</td></tr></tbody></table>';
        const result = sanitizeClinicalHtml(html);
        expect(result.html).toContain('<table>');
        expect(result.html).toContain('<thead>');
        expect(result.html).toContain('<tbody>');
        expect(result.html).toContain('<th>');
        expect(result.html).toContain('<td>');
        expect(result.html).toContain('Cabecera');
        expect(result.html).toContain('Celda');
    });

    it('permite colspan y rowspan enteros válidos en celdas', () => {
        const html = '<table><tr><td colspan="2" rowspan="3">Multi</td></tr></table>';
        const result = sanitizeClinicalHtml(html);
        expect(result.html).toContain('colspan="2"');
        expect(result.html).toContain('rowspan="3"');
    });

    it('elimina colspan/rowspan no numéricos o fuera de rango', () => {
        const html = '<table><tr><td colspan="200" rowspan="abc">Celda</td></tr></table>';
        const result = sanitizeClinicalHtml(html);
        expect(result.html).not.toContain('colspan="200"');
        expect(result.html).not.toContain('rowspan="abc"');
    });

    it('permite estilos de tabla seguros (border, padding, text-align)', () => {
        const html = '<table><tr><td style="border: 1px solid #000; padding: 4px; text-align: center">Celda</td></tr></table>';
        const result = sanitizeClinicalHtml(html);
        expect(result.html).toContain('border:');
        expect(result.html).toContain('padding:');
        expect(result.html).toContain('text-align:');
    });

    it('elimina atributos de evento en celdas de tabla', () => {
        const html = '<table><tr><td onclick="steal()">Dato</td></tr></table>';
        const result = sanitizeClinicalHtml(html);
        expect(result.html).not.toContain('onclick');
        expect(result.html).toContain('Dato');
    });

    // ── Additional security vectors ──────────────────────────────────────────

    it('rechaza imágenes data:image/svg+xml que pueden contener JS inline', () => {
        const svgDataUri = 'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIi8+';
        const html = `<img src="${svgDataUri}" alt="xss">`;
        const result = sanitizeClinicalHtml(html);
        expect(result.html).not.toContain('svg+xml');
        expect(result.html).not.toContain('<img');
    });

    it('rechaza imágenes con URLs externas (solo se permiten data URIs rasterizadas)', () => {
        const html = '<img src="https://evil.com/track.png" alt="track">';
        const result = sanitizeClinicalHtml(html);
        expect(result.html).not.toContain('<img');
        expect(result.html).not.toContain('evil.com');
    });

    it('elimina url() en background-color de celda de tabla para prevenir tracking', () => {
        const html = '<table><tr><td style="background-color: url(http://evil.com/pixel.gif)">Celda</td></tr></table>';
        const result = sanitizeClinicalHtml(html);
        expect(result.html).not.toContain('url(');
        expect(result.html).toContain('Celda');
    });

    it('descarta nodos con anidamiento excesivo (> 40 niveles) para prevenir stack overflow', () => {
        // Build deeply nested HTML using <blockquote> (valid nesting) so the
        // browser parser does not flatten the structure before sanitization.
        const open = '<blockquote>'.repeat(50);
        const close = '</blockquote>'.repeat(50);
        const html = `${open}<p>texto profundo</p>${close}`;
        const result = sanitizeClinicalHtml(html);
        // Content at depth > 40 is dropped; a warning must be emitted
        expect(result.warnings).toContain('Se eliminó contenido con anidamiento excesivo.');
    });
});
