import type { Chapter, Material } from "@/data/chapters";
import type { CorpusFile } from "@/lib/api";
import { corpusFileUrl } from "@/lib/api";

const CORPUS_MATERIAL_ID = "corpus";

/** Stable id from backend filename */
export function corpusChapterId(filename: string): string {
  return `corpus:${filename}`;
}

/**
 * One folder "Your documents" with one chapter per file from `data/`
 * (PDFs + PPTX in the reader; other types are download-only).
 */
const SKIP_FILE = /\.(json|py|faiss|pkl|md|env|txt|csv)$/i;
const SKIP_NAMES = new Set(["digital_twin.json", "projects.json", "index.faiss", "index.pkl"]);

function isStudyDocument(name: string) {
  if (SKIP_NAMES.has(name.toLowerCase())) return false;
  if (SKIP_FILE.test(name)) return false;
  return true;
}

export function buildCorpusMaterial(files: CorpusFile[]): Material | null {
  const docs = files.filter((f) => f.kind === "document" && isStudyDocument(f.name));
  if (docs.length === 0) return null;

  const chapters: Chapter[] = docs.map((f) => {
    const id = corpusChapterId(f.name);
    const lower = f.name.toLowerCase();
    if (lower.endsWith(".pdf")) {
      return {
        id,
        name: f.name,
        pages: 0,
        kind: "pdf",
        pdfUrl: corpusFileUrl(f.name),
        sourceFilename: f.name,
      };
    }
    if (lower.endsWith(".pptx")) {
      return {
        id,
        name: f.name,
        pages: 0,
        kind: "pptx",
        pptxUrl: corpusFileUrl(f.name),
        sourceFilename: f.name,
      };
    }
    return {
      id,
      name: f.name,
      pages: 0,
      kind: "download",
      sourceFilename: f.name,
    };
  });

  return {
    id: CORPUS_MATERIAL_ID,
    name: "Your documents",
    chapters,
  };
}

export { CORPUS_MATERIAL_ID };
