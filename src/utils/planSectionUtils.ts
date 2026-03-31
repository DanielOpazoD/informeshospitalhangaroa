/**
 * Utilities for the "Indicaciones al alta" plan section.
 *
 * The section stores one combined HTML string in section.content, but
 * renders as three separate subsection editors in the UI.
 * parse/build functions convert between both representations.
 *
 * Storage format:
 *   <p><strong>Indicaciones generales</strong></p>{content}
 *   <p><strong>Indicaciones farmacológicas</strong></p>{content}
 *   <p><strong>Control clínico</strong></p>{content}
 */

export type PlanSubsectionId = 'generales' | 'farmacologicas' | 'control_clinico';

export interface PlanSubsection {
    id: PlanSubsectionId;
    title: string;
}

export const PLAN_SUBSECTIONS: readonly PlanSubsection[] = [
    { id: 'generales',      title: 'Indicaciones generales' },
    { id: 'farmacologicas', title: 'Indicaciones farmacológicas' },
    { id: 'control_clinico', title: 'Control clínico' },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

const escapeRegExp = (text: string): string =>
    text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stripDiacritics = (text: string): string =>
    text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns true when the section title corresponds to the "Indicaciones al
 * alta" plan section (templates 3 and 4).  Comparison is accent-insensitive
 * and case-insensitive so a renamed section still triggers the behaviour.
 */
export const isPlanSection = (title: string): boolean =>
    stripDiacritics(title).trim().toLowerCase() === 'indicaciones al alta';

/**
 * Builds the combined HTML string from the three subsection contents.
 * Each subsection is prefixed with a bold paragraph heading that acts as
 * the delimiter used by parsePlanSectionContent.
 */
export const buildPlanSectionContent = (
    subsections: Record<PlanSubsectionId, string>,
): string =>
    PLAN_SUBSECTIONS
        .map(({ id, title }) => `<p><strong>${title}</strong></p>${subsections[id] || ''}`)
        .join('');

/**
 * Parses the combined HTML string into individual subsection contents.
 *
 * - Standard format (with bold headings): splits on known heading patterns.
 * - Legacy records (no headings): all content is placed in `generales`.
 */
export const parsePlanSectionContent = (
    html: string,
): Record<PlanSubsectionId, string> => {
    const result: Record<PlanSubsectionId, string> = {
        generales: '',
        farmacologicas: '',
        control_clinico: '',
    };

    if (!html.trim()) return result;

    // Locate each known heading in the HTML
    const positions: Array<{ id: PlanSubsectionId; start: number; end: number }> = [];

    for (const { id, title } of PLAN_SUBSECTIONS) {
        const pattern = new RegExp(
            `<p[^>]*>\\s*<strong[^>]*>\\s*${escapeRegExp(title)}\\s*</strong>\\s*</p>`,
            'i',
        );
        const match = pattern.exec(html);
        if (match !== null) {
            positions.push({ id, start: match.index, end: match.index + match[0].length });
        }
    }

    if (positions.length === 0) {
        // Legacy: no headings found → put everything in generales
        result.generales = html.trim();
        return result;
    }

    // Sort by position in the document
    positions.sort((a, b) => a.start - b.start);

    positions.forEach((pos, i) => {
        const contentStart = pos.end;
        const contentEnd = i + 1 < positions.length ? positions[i + 1].start : html.length;
        result[pos.id] = html.slice(contentStart, contentEnd).trim();
    });

    return result;
};
