import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ReactMarkdown from "react-markdown";
import { markdownPlugins } from "../src/services/markdown";
import { renderHtml } from "../src/services/exportHtml";
import { MermaidDiagram } from "../src/components/MermaidDiagram";

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (_id: string, code: string) => {
      if (code.includes("oops")) throw new Error("Parse error on line 1:\nmore detail");
      return { svg: `<svg data-test="mermaid"><text>${code.length}</text></svg>` };
    }),
  },
}));

function renderMd(md: string, math = true) {
  const { remarkPlugins, rehypePlugins } = markdownPlugins({ math });
  return render(
    <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
      {md}
    </ReactMarkdown>,
  ).container;
}

describe("math", () => {
  it("renders inline and display math as MathML", () => {
    const el = renderMd("Euler: $e^{i\\pi} + 1 = 0$\n\n$$\n\\int_0^1 x\\,dx\n$$");
    const maths = el.querySelectorAll("math");
    expect(maths).toHaveLength(2);
    expect(maths[1].getAttribute("display")).toBe("block");
    expect(el.textContent).toContain("Euler:");
  });

  it("can be turned off", () => {
    const el = renderMd("cost $5 and $10", false);
    expect(el.querySelector("math")).toBeNull();
    expect(el.textContent).toContain("$5 and $10");
  });

  it("does not let math bypass sanitization", () => {
    const el = renderMd('$x$ <script>alert(1)</script> $\\href{javascript:alert(1)}{x}$');
    expect(el.querySelector("script")).toBeNull();
    // \href is not trusted: the URL may only survive as inert TeX annotation text.
    const attrs = [...el.querySelectorAll("*")].flatMap((n) => [...n.attributes].map((a) => a.value));
    expect(attrs.some((v) => /javascript:/i.test(v))).toBe(false);
  });

  it("is included in HTML export", async () => {
    const html = await renderHtml("$$a^2$$", null, undefined, { math: true, diagrams: false });
    expect(html).toContain("<math");
  });
});

describe("mermaid diagrams", () => {
  it("renders diagrams through mermaid", async () => {
    render(<MermaidDiagram code={"graph TD; A-->B"} />);
    expect(screen.getByText("Rendering diagram…")).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector('svg[data-test="mermaid"]')).not.toBeNull());
  });

  it("shows the first line of a syntax error with the source", async () => {
    render(<MermaidDiagram code={"oops"} />);
    await waitFor(() => expect(screen.getByRole("note")).toHaveTextContent("Diagram error: Parse error on line 1:"));
    expect(screen.getByRole("note")).not.toHaveTextContent("more detail");
  });

  it("inlines diagrams into exported HTML", async () => {
    const html = await renderHtml("```mermaid\ngraph TD; A-->B\n```", null, undefined, { math: false, diagrams: true });
    expect(html).toContain('class="mermaid-diagram"');
    expect(html).toContain('data-test="mermaid"');
    expect(html).not.toContain("language-mermaid");
  });
});
