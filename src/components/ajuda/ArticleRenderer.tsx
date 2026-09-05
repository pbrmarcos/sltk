import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { visit } from "unist-util-visit";
import type { Root } from "mdast";
import { resolveDocImage } from "@/content/docs/media";
import { TldrBox, Step, Callout } from "./DocBlocks";

/**
 * remark plugin: convert :::name{attrs} directives into HTML nodes we can
 * intercept via ReactMarkdown component overrides.
 */
function remarkDocDirectives() {
  return (tree: Root) => {
    visit(tree, (node: any) => {
      if (
        node.type === "containerDirective" ||
        node.type === "leafDirective" ||
        node.type === "textDirective"
      ) {
        const data = node.data || (node.data = {});
        const attrs = node.attributes ?? {};
        data.hName = `doc-${node.name}`;
        data.hProperties = attrs;
      }
    });
  };
}

export function ArticleRenderer({ children, category }: { children: string; category?: string }) {
  const resolveImg = (name?: string): string | undefined => {
    if (!name) return undefined;
    if (name.startsWith("http") || name.startsWith("/")) return name;
    return resolveDocImage(category ?? "", name);
  };

  const components = {
    "doc-tldr": ({ children }: any) => <TldrBox>{children}</TldrBox>,
    "doc-step": ({ n, title, img, alt, children }: any) => (
      <Step n={n} title={title} img={resolveImg(img)} alt={alt}>
        {children}
      </Step>
    ),
    "doc-dica": ({ title, children }: any) => (
      <Callout kind="dica" title={title}>
        {children}
      </Callout>
    ),
    "doc-atencao": ({ title, children }: any) => (
      <Callout kind="atencao" title={title}>
        {children}
      </Callout>
    ),
    "doc-erro": ({ title, children }: any) => (
      <Callout kind="erro" title={title}>
        {children}
      </Callout>
    ),
    "doc-nota": ({ title, children }: any) => (
      <Callout kind="nota" title={title}>
        {children}
      </Callout>
    ),
    table: ({ children }: any) => (
      <div className="my-4 overflow-x-auto rounded-md border border-[var(--bg-border)]">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }: any) => <thead className="bg-[var(--bg-elevated)]">{children}</thead>,
    tbody: ({ children }: any) => <tbody>{children}</tbody>,
    tr: ({ children }: any) => (
      <tr className="border-b border-[var(--bg-border)] last:border-0 even:bg-[color-mix(in_oklab,var(--bg-elevated)_40%,transparent)]">
        {children}
      </tr>
    ),
    th: ({ children, style }: any) => (
      <th
        style={style}
        className="border-r border-[var(--bg-border)] last:border-r-0 px-3 py-2 text-left font-semibold text-[var(--text-primary)] align-top whitespace-nowrap"
      >
        {children}
      </th>
    ),
    td: ({ children, style }: any) => (
      <td
        style={style}
        className="border-r border-[var(--bg-border)] last:border-r-0 px-3 py-2 align-top text-[var(--text-primary)]"
      >
        {children}
      </td>
    ),
  } as unknown as Components;

  // Remove HTML comments (`<!-- ... -->`) — usados como marcadores no fonte
  // (ex.: `<!-- SHOTS:AUTO -->` para o docs:promote), mas não devem aparecer
  // como texto renderizado.
  const sanitized = (children ?? "").replace(/<!--[\s\S]*?-->/g, "");

  return (
    <div className="prose prose-sm max-w-none text-[var(--text-primary)] prose-headings:text-[var(--text-primary)] prose-a:text-[var(--info)] prose-strong:text-[var(--text-primary)] prose-code:text-[var(--text-primary)] prose-code:bg-[var(--bg-elevated)] prose-code:px-1 prose-code:rounded prose-pre:bg-[var(--bg-elevated)] prose-pre:text-[var(--text-primary)] prose-blockquote:text-[var(--text-muted)] prose-blockquote:border-[var(--bg-border)] prose-hr:border-[var(--bg-border)] prose-table:w-full prose-table:border-collapse prose-th:border prose-th:border-[var(--bg-border)] prose-th:bg-[var(--bg-elevated)] prose-th:px-2 prose-th:py-1 prose-th:text-left prose-th:text-[var(--text-primary)] prose-td:border prose-td:border-[var(--bg-border)] prose-td:px-2 prose-td:py-1 prose-td:align-top prose-td:text-[var(--text-primary)]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkDirective, remarkDocDirectives]}
        rehypePlugins={[rehypeSlug, [rehypeAutolinkHeadings, { behavior: "wrap" }]]}
        components={components}
      >
        {sanitized}
      </ReactMarkdown>
    </div>
  );
}
