/**
 * ipynb-parser.ts
 * ─────────────────────────────────────────────────────────────────────
 * Robust parser for Jupyter Notebook (.ipynb) files.
 * Extracts only the essential source code & markdown, stripping all
 * outputs and metadata to produce a minimal, high-density text payload
 * suitable for LLM context recovery.
 * ─────────────────────────────────────────────────────────────────────
 */

// ── Types ────────────────────────────────────────────────────────────

/** Represents a single cell in a Jupyter Notebook. */
interface NotebookCell {
  cell_type: string;
  source: string | string[];
  metadata?: Record<string, unknown>;
  outputs?: unknown[];
  execution_count?: number | null;
}

/** Top-level structure of a .ipynb JSON file. */
interface NotebookDocument {
  cells: NotebookCell[];
  metadata?: Record<string, unknown>;
  nbformat?: number;
  nbformat_minor?: number;
}

/** Return type from the parser – cleaned text + stats. */
export interface ParseResult {
  /** The cleaned, formatted text ready for LLM consumption. */
  cleanedText: string;
  /** Total number of cells found in the notebook. */
  totalCells: number;
  /** Number of cells that were included (code + markdown). */
  includedCells: number;
  /** Number of cells that were skipped (raw, etc.). */
  skippedCells: number;
}

// ── Allowed cell types ───────────────────────────────────────────────
const ALLOWED_CELL_TYPES = new Set(["code", "markdown"]);

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Normalize the `source` field.
 * .ipynb files store source as either a single string or an array of
 * strings (one per line). This always returns a single string.
 */
function normalizeSource(source: string | string[]): string {
  if (Array.isArray(source)) {
    return source.join("");
  }
  return source;
}

/**
 * Format a single cell into a human-readable, LLM-friendly block.
 * Uses the pattern: ## [Type] Cell #[Index]\n[Source Content]
 */
function formatCell(
  cellType: string,
  index: number,
  source: string
): string {
  const label = cellType.charAt(0).toUpperCase() + cellType.slice(1);
  return `## ${label} Cell #${index}\n${source.trimEnd()}`;
}

// ── Main Parser ──────────────────────────────────────────────────────

/**
 * Parse raw .ipynb JSON into a high-density text summary.
 *
 * @param rawJson - The raw JSON string content of a .ipynb file.
 * @returns A `ParseResult` with the cleaned text and cell statistics.
 * @throws {Error} If the JSON is invalid or doesn't contain cells.
 */
export function parseNotebook(rawJson: string): ParseResult {
  // 1. Parse the JSON
  let notebook: NotebookDocument;
  try {
    notebook = JSON.parse(rawJson) as NotebookDocument;
  } catch {
    throw new Error(
      "Invalid JSON: The file does not appear to be a valid .ipynb notebook."
    );
  }

  // 2. Validate structure
  if (!notebook.cells || !Array.isArray(notebook.cells)) {
    throw new Error(
      "Invalid notebook structure: No 'cells' array found. Ensure this is a Jupyter Notebook file."
    );
  }

  // 3. Filter & transform cells
  const blocks: string[] = [];
  let includedCells = 0;
  let skippedCells = 0;
  let cellIndex = 1; // 1-indexed for readability

  for (const cell of notebook.cells) {
    if (!ALLOWED_CELL_TYPES.has(cell.cell_type)) {
      // Skip raw cells, unknown types, etc.
      skippedCells++;
      continue;
    }

    const source = normalizeSource(cell.source);

    // Skip empty cells – they add no value
    if (source.trim().length === 0) {
      skippedCells++;
      continue;
    }

    // Format and collect – NO outputs, NO metadata
    blocks.push(formatCell(cell.cell_type, cellIndex, source));
    includedCells++;
    cellIndex++;
  }

  // 4. Assemble final output with clear separators
  const cleanedText = blocks.join("\n\n---\n\n");

  return {
    cleanedText,
    totalCells: notebook.cells.length,
    includedCells,
    skippedCells,
  };
}
