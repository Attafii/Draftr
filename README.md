# Draftr

Draftr is a document workspace built with Next.js and TypeScript for converting, editing, annotating, exporting, and AI-reviewing PDF and Markdown files.

## Features

- PDF and Markdown upload with client-side conversion.
- PDF preview, text editing, and annotation tools.
- AI analysis and rewrite workflow with a local fallback when no NVIDIA key is configured.
- Markdown and PDF export flows.
- OCR, merge, split, fill, compress, and image enhancement tools.

## Getting Started

1. Install dependencies.
2. Copy `.env.example` to `.env.local` and fill in any environment variables you need.
3. Start the app with `npm run dev`.

## Environment Variables

- `NEXT_PUBLIC_SITE_URL`: Public site URL used for metadata and canonical links.
- `NEXT_PUBLIC_NVIDIA_MODEL`: Model label shown in the UI.
- `NVIDIA_MODEL`: Model used by the AI API route.
- `NVIDIA_API_KEY`: Optional. When omitted, the AI route falls back to a local heuristic response.

## Scripts

- `npm run dev`: Start the development server.
- `npm run build`: Build the production app.
- `npm run start`: Start the production server.
- `npm run analyze`: Build with the Next.js bundle analyzer enabled.
- `npm run test`: Run the unit tests with Vitest.
- `npm run e2e`: Run the browser E2E suite with Playwright.
- `npm run lint`: Run the Next.js lint check.

## Browser E2E

The browser E2E suite lives under `tests/e2e` and covers the primary user journeys:

- upload and conversion
- AI rewrite
- OCR
- PDF annotations
- export flows

If Playwright browsers are not installed yet, run:

```bash
npx playwright install chromium
```

Then run the suite:

```bash
npm run e2e
```

## Bundle Analysis

Next.js bundle analysis is wired through `@next/bundle-analyzer`. Run:

```bash
npm run analyze
```

That produces the analyzer output for the current build so you can inspect heavy client bundles like PDF rendering and OCR dependencies.

## Project Structure

- `app/`: App Router pages and API routes.
- `components/`: UI, landing page, and workspace components.
- `lib/`: Conversion, export, OCR, revision, and helper logic.
- `tests/`: Vitest unit tests and Playwright E2E tests.