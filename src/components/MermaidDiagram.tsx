import { useEffect, useState } from "react";
import { renderMermaid } from "../services/mermaid";

/** Renders a Mermaid diagram in the preview (lazy-loads Mermaid on first use). */
export function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dark = typeof document !== "undefined" && document.documentElement.dataset.theme === "dark";

  useEffect(() => {
    let cancelled = false;
    renderMermaid(code, dark)
      .then((out) => {
        if (!cancelled) {
          setSvg(out);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [code, dark]);

  if (error) {
    return (
      <div className="mermaid-error" role="note">
        <strong>Diagram error:</strong> {error.split("\n")[0]}
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    );
  }
  if (!svg) return <div className="mermaid-diagram loading">Rendering diagram…</div>;
  // Output of Mermaid in strict mode (sanitized by Mermaid's DOMPurify).
  return <div className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: svg }} />;
}
