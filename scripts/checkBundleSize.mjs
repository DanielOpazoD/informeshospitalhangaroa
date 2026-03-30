import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const distAssetsDir = join(process.cwd(), 'dist', 'assets');
const maxKb = Number(process.env.MAX_MAIN_CHUNK_KB || 800);
const domainBudgetsKb = {
    index: Number(process.env.MAX_INDEX_CHUNK_KB || 200),
    google: Number(process.env.MAX_GOOGLE_CHUNK_KB || 120),
    hhr: Number(process.env.MAX_HHR_CHUNK_KB || 520),
    pdf: Number(process.env.MAX_PDF_CHUNK_KB || 650),
    ai: Number(process.env.MAX_AI_CHUNK_KB || 180),
    cartola: Number(process.env.MAX_CARTOLA_CHUNK_KB || 220),
};

const toKb = bytes => bytes / 1024;
const prettyKb = bytes => `${toKb(bytes).toFixed(2)} kB`;

const jsFiles = readdirSync(distAssetsDir)
    .filter(file => file.endsWith('.js'))
    .map(file => {
        const absolutePath = join(distAssetsDir, file);
        const size = statSync(absolutePath).size;
        return { file, size };
    })
    .sort((a, b) => b.size - a.size);

if (!jsFiles.length) {
    console.error('No se encontraron bundles JS en dist/assets. Ejecute primero `npm run build`.');
    process.exit(1);
}

const largest = jsFiles[0];
console.log(`Chunk JS más grande: ${largest.file} (${prettyKb(largest.size)})`);

if (toKb(largest.size) > maxKb) {
    console.error(`❌ El chunk más grande excede el límite de ${maxKb} kB.`);
    process.exit(1);
}

for (const [domain, budgetKb] of Object.entries(domainBudgetsKb)) {
    const matchingChunk = jsFiles.find(file => file.file.startsWith(`${domain}-`));
    if (!matchingChunk) {
        continue;
    }

    console.log(`Presupuesto ${domain}: ${matchingChunk.file} (${prettyKb(matchingChunk.size)}) / límite ${budgetKb} kB`);
    if (toKb(matchingChunk.size) > budgetKb) {
        console.error(`❌ El chunk ${domain} excede el límite de ${budgetKb} kB.`);
        process.exit(1);
    }
}

console.log(`✅ El chunk más grande está dentro del límite (${maxKb} kB).`);
