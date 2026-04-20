#!/usr/bin/env node
/**
 * WorkPilot — Generador de PDFs gerenciales
 *
 * Lee cada HTML en src/ (ignorando _*.html), lo carga en Chromium headless,
 * espera a que Mermaid termine de renderizar, y exporta como PDF corporativo
 * en pdf/.
 *
 * Uso:
 *   node generate-pdfs.mjs            # genera todos
 *   node generate-pdfs.mjs 01 05      # genera solo los que empiezan con 01 o 05
 */

import puppeteer from 'puppeteer';
import { readdirSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, 'src');
const OUT_DIR = resolve(__dirname, 'pdf');

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// ── Filter args (si el usuario pasa prefijos, solo genera esos) ──
const filters = process.argv.slice(2).filter(a => !a.startsWith('--'));

// ── Listar HTMLs ──
const htmlFiles = readdirSync(SRC_DIR)
  .filter(f => f.endsWith('.html') && !f.startsWith('_'))
  .filter(f => filters.length === 0 || filters.some(p => f.startsWith(p)))
  .sort();

if (htmlFiles.length === 0) {
  console.log('⚠ No se encontraron archivos HTML para generar.');
  process.exit(0);
}

console.log(`📄 Generando ${htmlFiles.length} PDF(s) corporativos...`);

// ── Header/Footer corporativo en cada página (excepto portada) ──
const headerTemplate = `
  <div style="
    font-family: 'Inter', sans-serif;
    font-size: 8pt;
    color: #64748B;
    width: 100%;
    padding: 0 18mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 0.5pt solid #E2E8F0;
    padding-bottom: 4pt;
  ">
    <span style="font-weight: 600; color: #1E3A5F;">
      <span style="display:inline-block;width:10pt;height:10pt;background:#1E3A5F;color:white;border-radius:2pt;text-align:center;line-height:10pt;font-size:7pt;font-weight:800;margin-right:4pt;">W</span>
      WorkPilot
    </span>
    <span class="title"></span>
    <span style="font-size: 7pt; letter-spacing: 0.1em; text-transform: uppercase;">CONFIDENCIAL</span>
  </div>
`;

const footerTemplate = `
  <div style="
    font-family: 'Inter', sans-serif;
    font-size: 8pt;
    color: #94A3B8;
    width: 100%;
    padding: 0 18mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
  ">
    <span>workpilot.io</span>
    <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
    <span>© 2026 WorkPilot</span>
  </div>
`;

// ── Abrir browser (Windows-compatible) ──
const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--font-render-hinting=none',
  ],
});

try {
  for (const file of htmlFiles) {
    const srcPath = resolve(SRC_DIR, file);
    const outPath = resolve(OUT_DIR, file.replace(/\.html$/, '.pdf'));
    const url = pathToFileURL(srcPath).href;

    console.log(`\n  → ${file}`);

    const page = await browser.newPage();
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });

    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 });

      // Esperar a que Mermaid termine (flag seteada en el HTML)
      await page.waitForFunction(() => window.mermaid_ready === true, { timeout: 20_000 }).catch(() => {
        console.warn('    ⚠ Mermaid no señaló ready — se continúa igualmente.');
      });

      // Pequeño buffer para asegurar render de SVGs y fuentes
      await new Promise(r => setTimeout(r, 600));

      await page.pdf({
        path: outPath,
        format: 'Letter',
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
        margin: {
          top: '22mm',
          bottom: '18mm',
          left: '18mm',
          right: '18mm',
        },
      });

      console.log(`    ✓ ${outPath.replace(__dirname + '\\', '').replace(__dirname + '/', '')}`);
    } catch (err) {
      console.error(`    ✗ Error generando ${file}:`, err.message);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

console.log('\n✅ Generación completa.\n');
