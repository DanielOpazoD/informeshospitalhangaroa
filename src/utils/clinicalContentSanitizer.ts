const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'EM', 'UL', 'OL', 'LI', 'CODE', 'IMG', 'BLOCKQUOTE']);
const DROP_WITH_CONTENT_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG']);
const SILENT_UNWRAP_TAGS = new Set(['DIV', 'SPAN', 'FONT']);

const INDENT_STYLE_NAMES = new Set(['margin-left', 'padding-left', 'text-indent']);

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

const parseCssLengthToPx = (value: string): number => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return 0;

    const match = normalized.match(/^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/);
    if (!match) return 0;

    const amount = Number.parseFloat(match[1]);
    const unit = match[2] || 'px';
    if (!Number.isFinite(amount) || amount <= 0) return 0;

    switch (unit) {
        case 'px':
            return amount;
        case 'em':
        case 'rem':
            return amount * 16;
        case '%':
            return (amount / 100) * 16;
        default:
            return 0;
    }
};

const getIndentLevelFromStyle = (styleValue: string): number => {
    const declarations = styleValue
        .split(';')
        .map(chunk => chunk.trim())
        .filter(Boolean);

    let maxIndentPx = 0;
    declarations.forEach(declaration => {
        const [rawName, rawValue = ''] = declaration.split(':');
        if (!rawName) return;
        const name = rawName.trim().toLowerCase();
        if (!INDENT_STYLE_NAMES.has(name)) return;
        const px = parseCssLengthToPx(rawValue);
        if (px > maxIndentPx) {
            maxIndentPx = px;
        }
    });

    return Math.min(6, Math.floor(maxIndentPx / 32));
};

const isTopLevelListItem = (node: HTMLElement): boolean => node.tagName === 'LI' && node.parentElement?.tagName !== 'UL' && node.parentElement?.tagName !== 'OL';

const wrapWithIndentBlockquotes = (node: HTMLElement, levels: number): HTMLElement => {
    let wrapped = node;
    for (let i = 0; i < levels; i += 1) {
        const blockquote = document.createElement('blockquote');
        wrapped.replaceWith(blockquote);
        blockquote.appendChild(wrapped);
        wrapped = blockquote;
    }
    return wrapped;
};

const normalizeIndentationMarkup = (container: HTMLElement): void => {
    const nodesWithStyle = Array.from(container.querySelectorAll<HTMLElement>('[style]'));

    nodesWithStyle.forEach(node => {
        const styleAttribute = node.getAttribute('style') || '';
        const indentLevels = getIndentLevelFromStyle(styleAttribute);
        if (indentLevels === 0) return;

        if (node.tagName === 'LI') {
            return;
        }

        if (node.tagName === 'DIV') {
            const paragraph = document.createElement('p');
            while (node.firstChild) {
                paragraph.appendChild(node.firstChild);
            }
            if (!paragraph.childNodes.length) {
                paragraph.appendChild(document.createElement('br'));
            }
            node.replaceWith(paragraph);
            wrapWithIndentBlockquotes(paragraph, indentLevels);
            return;
        }

        if (!isTopLevelListItem(node)) {
            wrapWithIndentBlockquotes(node, indentLevels);
        }
    });
};

const sanitizeStyleAttribute = (node: HTMLElement, styleValue: string): string | null => {
    const declarations = styleValue
        .split(';')
        .map(chunk => chunk.trim())
        .filter(Boolean);

    if (declarations.length === 0) return null;

    const safeDeclarations: string[] = [];

    declarations.forEach(declaration => {
        const [rawName, rawValue = ''] = declaration.split(':');
        if (!rawName) return;
        const name = rawName.trim().toLowerCase();
        const value = rawValue.trim();
        if (!INDENT_STYLE_NAMES.has(name)) return;

        const px = parseCssLengthToPx(value);
        if (px <= 0) return;

        if (node.tagName === 'LI') {
            safeDeclarations.push(`${name}: ${Math.min(px, 192)}px`);
        }
    });

    if (!safeDeclarations.length) return null;
    return safeDeclarations.join('; ');
};

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

    normalizeIndentationMarkup(container);

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

            if (attributeName === 'style') {
                const safeStyle = sanitizeStyleAttribute(node, attributeValue);
                if (safeStyle) {
                    node.setAttribute('style', safeStyle);
                } else {
                    node.removeAttribute('style');
                    warnings.add('Se eliminaron estilos no permitidos del contenido clínico.');
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
