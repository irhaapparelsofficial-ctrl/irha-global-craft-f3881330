import type { ReactNode } from "react";
import { Link } from "react-router-dom";

function safeHref(value: string) {
  const href = value.trim();
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (/^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(href)) return href;
  return null;
}

function inline(value: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    if (match.index > cursor) nodes.push(value.slice(cursor, match.index));
    const token = match[0];
    const key = `${match.index}-${token}`;

    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(<strong key={key} className="font-semibold text-foreground">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(<code key={key} className="rounded-sm bg-secondary px-1.5 py-0.5 text-[0.9em]">{token.slice(1, -1)}</code>);
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const href = linkMatch ? safeHref(linkMatch[2]) : null;
      if (!linkMatch || !href) {
        nodes.push(token);
      } else if (href.startsWith("/")) {
        nodes.push(<Link key={key} to={href} className="text-gold underline underline-offset-4">{linkMatch[1]}</Link>);
      } else {
        nodes.push(
          <a key={key} href={href} target="_blank" rel="noreferrer noopener" className="text-gold underline underline-offset-4">
            {linkMatch[1]}
          </a>,
        );
      }
    }
    cursor = pattern.lastIndex;
  }

  if (cursor < value.length) nodes.push(value.slice(cursor));
  return nodes;
}

type Block =
  | { type: "h2" | "h3" | "h4" | "p" | "quote"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "hr" };

function parse(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ type: "p", text });
    paragraph = [];
  };
  const flushList = () => {
    if (listType && listItems.length) blocks.push({ type: listType, items: listItems });
    listType = null;
    listItems = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const nextType = unordered ? "ul" : "ol";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push((unordered || ordered)![1]);
      continue;
    }

    flushList();
    if (/^---+$/.test(line)) {
      flushParagraph();
      blocks.push({ type: "hr" });
    } else if (line.startsWith("### ")) {
      flushParagraph();
      blocks.push({ type: "h4", text: line.slice(4) });
    } else if (line.startsWith("## ")) {
      flushParagraph();
      blocks.push({ type: "h3", text: line.slice(3) });
    } else if (line.startsWith("# ")) {
      flushParagraph();
      blocks.push({ type: "h2", text: line.slice(2) });
    } else if (line.startsWith("> ")) {
      flushParagraph();
      blocks.push({ type: "quote", text: line.slice(2) });
    } else {
      paragraph.push(line);
    }
  }

  flushParagraph();
  flushList();
  return blocks;
}

export default function SafeMarkdown({ markdown }: { markdown: string }) {
  const blocks = parse(markdown);
  return (
    <div className="space-y-6 text-foreground/75 leading-8">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === "h2") return <h2 key={key} className="font-display text-3xl md:text-4xl text-foreground leading-tight pt-5">{inline(block.text)}</h2>;
        if (block.type === "h3") return <h3 key={key} className="font-display text-2xl md:text-3xl text-foreground leading-tight pt-4">{inline(block.text)}</h3>;
        if (block.type === "h4") return <h4 key={key} className="font-display text-xl md:text-2xl text-foreground leading-tight pt-3">{inline(block.text)}</h4>;
        if (block.type === "quote") return <blockquote key={key} className="border-l-2 border-gold pl-5 italic text-foreground/70">{inline(block.text)}</blockquote>;
        if (block.type === "hr") return <hr key={key} className="border-border/60" />;
        if (block.type === "ul") return <ul key={key} className="list-disc pl-6 space-y-2">{block.items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ul>;
        if (block.type === "ol") return <ol key={key} className="list-decimal pl-6 space-y-2">{block.items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ol>;
        return <p key={key}>{inline(block.text)}</p>;
      })}
    </div>
  );
}
