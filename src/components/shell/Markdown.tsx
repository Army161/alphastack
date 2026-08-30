"use client";

import * as React from "react";

/**
 * Small, dependency-free markdown renderer covering exactly what the agent
 * emits: headings, bold/italic/code inline, fenced code, tables, lists, rules.
 */
export function Markdown({ text }: { text: string }) {
  const blocks = React.useMemo(() => parse(text), [text]);
  return <div className="prose-chat text-[13px] text-ink-200">{blocks}</div>;
}

function inline(s: string, key: string | number): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) nodes.push(s.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) nodes.push(<strong key={`${key}-b${i}`}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) nodes.push(<code key={`${key}-c${i}`}>{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("[")) {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok)!;
      nodes.push(
        <a key={`${key}-a${i}`} href={mm[2]} target="_blank" rel="noreferrer">
          {mm[1]}
        </a>
      );
    } else nodes.push(<em key={`${key}-i${i}`}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
    i++;
  }
  if (last < s.length) nodes.push(s.slice(last));
  return nodes;
}

function parse(src: string): React.ReactNode[] {
  const lines = src.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3);
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        body.push(lines[i]);
        i++;
      }
      i++;
      out.push(
        <pre key={key++}>
          <code data-lang={lang}>{body.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Table
    if (line.includes("|") && lines[i + 1]?.match(/^\s*\|?[\s:|-]+\|/)) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      out.push(
        <table key={key++}>
          <thead>
            <tr>
              {header.map((h, x) => (
                <th key={x}>{inline(h, `h${x}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, y) => (
              <tr key={y}>
                {r.map((c, x) => (
                  <td key={x}>{inline(c, `c${y}-${x}`)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
      continue;
    }

    // Horizontal rule
    if (/^\s*---+\s*$/.test(line)) {
      out.push(<hr key={key++} />);
      i++;
      continue;
    }

    // Heading
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const Tag = (level === 1 ? "h1" : level === 2 ? "h2" : "h3") as "h1" | "h2" | "h3";
      out.push(<Tag key={key++}>{inline(h[2], `hd${key}`)}</Tag>);
      i++;
      continue;
    }

    // List
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];
      while (
        i < lines.length &&
        (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))
      ) {
        items.push(lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, ""));
        i++;
      }
      const Tag = ordered ? "ol" : "ul";
      out.push(
        <Tag key={key++}>
          {items.map((it, x) => (
            <li key={x}>{inline(it, `li${x}`)}</li>
          ))}
        </Tag>
      );
      continue;
    }

    // Blank
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].includes("|") &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^#{1,4}\s/.test(lines[i]) &&
      !lines[i].trim().startsWith("```") &&
      !/^\s*---+\s*$/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    if (para.length) out.push(<p key={key++}>{inline(para.join(" "), `p${key}`)}</p>);
    else i++;
  }
  return out;
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}
