function trimLeadingSqlTrivia(value) {
  let text = String(value);

  while (true) {
    text = text.replace(/^\s+/, "");
    if (text.startsWith("--")) {
      const newline = text.search(/[\r\n]/);
      text = newline === -1 ? "" : text.slice(newline + 1);
      continue;
    }
    if (text.startsWith("/*")) {
      let index = 2;
      let depth = 1;
      while (index < text.length && depth > 0) {
        if (text.startsWith("/*", index)) {
          depth += 1;
          index += 2;
        } else if (text.startsWith("*/", index)) {
          depth -= 1;
          index += 2;
        } else {
          index += 1;
        }
      }
      if (depth !== 0) throw new Error("Unterminated leading SQL block comment");
      text = text.slice(index);
      continue;
    }
    return text;
  }
}

function trimTrailingSqlTrivia(value) {
  let text = String(value);

  while (true) {
    text = text.replace(/\s+$/, "");
    if (text.endsWith("*/")) {
      const start = text.lastIndexOf("/*");
      if (start === -1) throw new Error("Unterminated trailing SQL block comment");
      text = text.slice(0, start);
      continue;
    }
    const lineStart = Math.max(text.lastIndexOf("\n"), text.lastIndexOf("\r")) + 1;
    if (text.slice(lineStart).trimStart().startsWith("--")) {
      text = text.slice(0, lineStart);
      continue;
    }
    return text;
  }
}

function trimSqlEdgeTrivia(value) {
  return trimTrailingSqlTrivia(trimLeadingSqlTrivia(value)).trim();
}

/**
 * Preserve executable SQL while masking comments, identifiers and literal
 * values. Repository verification may inspect privilege strings such as
 * 'execute' without treating those values as executable mutation commands.
 */
export function sqlCodeOnly(value) {
  const sql = String(value);
  let output = "";
  let index = 0;

  const mask = (length) => {
    output += " ".repeat(length);
    index += length;
  };

  while (index < sql.length) {
    if (sql.startsWith("--", index)) {
      const start = index;
      index += 2;
      while (index < sql.length && sql[index] !== "\n" && sql[index] !== "\r") index += 1;
      output += " ".repeat(index - start);
      continue;
    }

    if (sql.startsWith("/*", index)) {
      const start = index;
      index += 2;
      let depth = 1;
      while (index < sql.length && depth > 0) {
        if (sql.startsWith("/*", index)) {
          depth += 1;
          index += 2;
        } else if (sql.startsWith("*/", index)) {
          depth -= 1;
          index += 2;
        } else {
          index += 1;
        }
      }
      if (depth !== 0) throw new Error("Unterminated SQL block comment");
      output += " ".repeat(index - start);
      continue;
    }

    if (sql[index] === "'") {
      const start = index;
      index += 1;
      while (index < sql.length) {
        if (sql[index] === "'" && sql[index + 1] === "'") {
          index += 2;
          continue;
        }
        if (sql[index] === "'") {
          index += 1;
          break;
        }
        index += 1;
      }
      output += " ".repeat(index - start);
      continue;
    }

    if (sql[index] === '"') {
      const start = index;
      index += 1;
      while (index < sql.length) {
        if (sql[index] === '"' && sql[index + 1] === '"') {
          index += 2;
          continue;
        }
        if (sql[index] === '"') {
          index += 1;
          break;
        }
        index += 1;
      }
      output += " ".repeat(index - start);
      continue;
    }

    if (sql[index] === "$") {
      const tag = sql.slice(index).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/)?.[0];
      if (tag) {
        const start = index;
        index += tag.length;
        const close = sql.indexOf(tag, index);
        if (close === -1) throw new Error(`Unterminated SQL dollar quote ${tag}`);
        index = close + tag.length;
        output += " ".repeat(index - start);
        continue;
      }
    }

    output += sql[index];
    index += 1;
  }

  return output;
}

export function transactionBody(sql, entry = {}) {
  const candidate = trimSqlEdgeTrivia(sql);
  const wrapped = candidate.match(/^begin\s*;\s*([\s\S]*?)\s*commit\s*;?$/i);
  const body = (wrapped ? wrapped[1] : candidate).trim();
  const version = entry.version || "unknown";

  if (!body) throw new Error(`Migration ${version} has no transactional SQL body`);
  if (/\b(begin|commit|rollback)\s*;/i.test(sqlCodeOnly(body))) {
    throw new Error(`Migration ${version} contains nested transaction control`);
  }
  return body;
}
