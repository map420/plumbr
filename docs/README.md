# WorkPilot — Documentos gerenciales

Esta carpeta contiene los documentos gerenciales de WorkPilot en formato PDF,
generados desde fuentes HTML editables.

## Estructura

```
docs/
├── src/              # Fuentes HTML (editá acá)
│   ├── _styles.css   # Estilos corporativos compartidos
│   ├── _template.html# Plantilla base para nuevos documentos
│   └── NN-nombre.html
├── pdf/              # PDFs generados (no editar manualmente)
├── assets/           # Logos, imágenes
├── generate-pdfs.mjs # Script de generación
└── package.json
```

## Generar PDFs

```bash
cd docs
pnpm install       # solo primera vez
node generate-pdfs.mjs
```

Para regenerar solo uno o algunos documentos:

```bash
node generate-pdfs.mjs 01         # solo el executive brief
node generate-pdfs.mjs 03 04      # análisis competitivo + estrategia producto
```

## Editar contenido

1. Abrí el HTML correspondiente en `src/`
2. Modificá el contenido (el CSS está en `_styles.css`)
3. Ejecutá `node generate-pdfs.mjs NN` donde `NN` es el prefijo del archivo
4. Revisá el PDF actualizado en `pdf/`

## Componentes CSS disponibles

Ver `src/_template.html` para ejemplos. Resumen:

- **Portada:** `.cover` con `.cover-header`, `.cover-body`, `.cover-footer`
- **Índice:** `.toc` con `.toc-list`
- **Callouts:** `.callout.info`, `.callout.insight`, `.callout.warning`, `.callout.critical`, `.callout.success`
- **Tablas:** standard `<table>` (auto-estilada), agregar `.compact` para menor padding
- **KPI cards:** `.kpi-grid` con `.cols-2`, `.cols-3`, `.cols-4` y `.kpi-card`
- **Pills/Badges:** `.pill.primary`, `.pill.success`, etc.
- **Persona Carlos:** `.persona-box`
- **SWOT 2x2:** `.swot-matrix` con `.swot-cell.strengths/weaknesses/opportunities/threats`
- **Dos columnas:** `.two-col` con `.col-box`
- **Recomendaciones finales:** `.recommendations`
- **Diagramas:** `<div class="mermaid">...</div>`

## Listado de documentos

| # | Documento | Contenido |
|---|-----------|-----------|
| 01 | Executive Brief | Visión general de WorkPilot |
| 02 | Manual Operativo | Cómo funciona la app (flujos, roles) |
| 03 | Análisis Competitivo | vs Jobber, HCP, ServiceTitan, FieldEdge |
| 04 | Estrategia de Producto | Diferenciadores, roadmap, gaps |
| 05 | Estrategia AI | WorkPilot AI como diferenciador |
| 06 | Modelo de Negocio y Pricing | Planes, unit economics |
| 07 | Análisis de Riesgos (SWOT) | SWOT + Moats + Churn |
| 08 | Análisis de Mercado | TAM/SAM/SOM, segmentos |
| 09 | Estrategia Go-to-Market | Canales, partnerships, crecimiento |
