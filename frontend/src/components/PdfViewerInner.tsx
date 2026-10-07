import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

/** Loaded only on the client — avoids SSR importing pdf.js (needs Promise.withResolvers in Node). */
export function PdfViewerInner({ url }: { url: string }) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [width, setWidth] = useState(640);

  useEffect(() => {
    const el = document.getElementById("pdf-container");
    if (!el) return;
    const measure = () => setWidth(Math.max(240, el.clientWidth - 8));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div id="pdf-container" className="w-full">
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={
          <div className="grid place-items-center h-[400px] text-muted-foreground">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading PDF…
            </div>
          </div>
        }
        error={
          <div className="grid place-items-center h-[400px] text-sm text-destructive">
            Couldn't load this PDF.
          </div>
        }
      >
        <div className="flex justify-center">
          <Page
            pageNumber={page}
            width={width}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            className="shadow-card rounded-lg overflow-hidden"
          />
        </div>
      </Document>

      {numPages > 0 && (
        <div className="flex items-center justify-between mt-3 px-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-card disabled:opacity-40 transition"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <div className="text-xs text-muted-foreground font-medium">
            Page {page} of {numPages}
          </div>
          <button
            type="button"
            disabled={page >= numPages}
            onClick={() => setPage((p) => Math.min(numPages, p + 1))}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-card disabled:opacity-40 transition"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
