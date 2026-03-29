const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'EM', 'UL', 'OL', 'LI', 'CODE', 'IMG', 'BLOCKQUOTE']);
const DROP_WITH_CONTENT_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG']);
const SILENT_UNWRAP_TAGS = new Set(['DIV', 'SPAN', 'FONT']);

const htmlFallbackToPlainText = (html: string): string =>
    html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s{2,}/g, ' ')
        .trim();

const escapeHtml = (text: string): string =>
    text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const normalizePlainTextToHtml = (text: string): string =>
    text
        .split(/\n{2,}/)
        .map(paragraph => paragraph.trim())
        .filter(Boolean)
        .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
        .join('');

export const sanitizeClinicalHtml = (
    html: string,
): { html: string; warnings: string[] } => {
    if (!html.trim()) {
        return { html: '', warnings: [] };
    }

    if (typeof document === 'undefined') {
        const fallback = htmlFallbackToPlainText(html);
        return {
            html: fallback ? normalizePlainTextToHtml(fallback) : '',
            warnings: fallback === html.trim() ? [] : ['Se eliminó formato no seguro del contenido clínico.'],
        };
    }

    const container = document.createElement('div');
    container.innerHTML = html;
    const warnings = new Set<string>();

    const sanitizeNode = (node: Node): void => {
        if (node.nodeType === Node.TEXT_NODE) {
            return;
        }

        if (!(node instanceof HTMLElement)) {
            node.parentNode?.removeChild(node);
            warnings.add('Se removieron nodos incompatibles del contenido clínico.');
            return;
        }

        if (!ALLOWED_TAGS.has(node.tagName)) {
            if (node.tagName === 'DIV') {
                const paragraph = document.createElement('p');
                while (node.firstChild) {
                    paragraph.appendChild(node.firstChild);
                }
                if (!paragraph.childNodes.length) {
                    paragraph.appendChild(document.createElement('br'));
                }
                node.replaceWith(paragraph);
                sanitizeNode(paragraph);
                return;
            }

            if (!SILENT_UNWRAP_TAGS.has(node.tagName)) {
                warnings.add('Se removieron etiquetas HTML no permitidas.');
            }
            if (DROP_WITH_CONTENT_TAGS.has(node.tagName)) {
                node.remove();
                return;
            }
            const parent = node.parentNode;
            if (!parent) {
                return;
            }
            while (node.firstChild) {
                parent.insertBefore(node.firstChild, node);
            }
            parent.removeChild(node);
            return;
        }

        Array.from(node.attributes).forEach(attribute => {
            const attributeName = attribute.name.toLowerCase();
            const attributeValue = attribute.value.trim();
            const isEventHandler = attributeName.startsWith('on');
            const isAllowedImageAttribute = node.tagName === 'IMG' && (attributeName === 'src' || attributeName === 'alt');

            if (isEventHandler) {
                node.removeAttribute(attribute.name);
                warnings.add('Se eliminaron atributos HTML inseguros.');
                return;
            }

            if (node.tagName === 'IMG' && attributeName === 'src') {
                if (!attributeValue.startsWith('data:image/')) {
                    node.remove();
                    warnings.add('Se eliminaron imágenes externas no permitidas.');
                }
                return;
            }

            if (!isAllowedImageAttribute) {
                node.removeAttribute(attribute.name);
                if (attributeName !== 'class') {
                    warnings.add('Se eliminaron atributos HTML no permitidos.');
                }
            }
        });

        Array.from(node.childNodes).forEach(child => sanitizeNode(child));
    };

    Array.from(container.childNodes).forEach(child => sanitizeNode(child));

    return {
        html: container.innerHTML.trim(),
        warnings: Array.from(warnings),
    };
};
