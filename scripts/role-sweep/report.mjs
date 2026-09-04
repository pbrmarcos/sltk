export function renderReport({ generatedAt, appVersion, results }) {
  const total = results.reduce((a, r) => a + (r.allowedTotal ?? 0), 0);
  const divs = results.reduce((a, r) => a + (r.divergences?.length ?? 0), 0);
  const lines = [];
  lines.push(`# Role Sweep Report`);
  lines.push("");
  lines.push(`- Generated: ${generatedAt}`);
  lines.push(`- App version: ${appVersion ?? "unknown"}`);
  lines.push(`- Roles: ${results.length}`);
  lines.push(`- Routes visited: ${total}`);
  lines.push(`- Divergences: **${divs}**`);
  lines.push("");
  lines.push(`## Summary`);
  lines.push("");
  lines.push(`| Role | Email | Login | Routes | Divergences |`);
  lines.push(`|------|-------|-------|--------|-------------|`);
  for (const r of results) {
    lines.push(
      `| ${r.role} | ${r.email} | ${r.login ? "✅" : "❌"} | ${r.allowedTotal ?? 0} | ${r.divergences?.length ?? 0} |`,
    );
  }
  lines.push("");
  if (divs === 0) {
    lines.push(`## Divergences`);
    lines.push("");
    lines.push(`_None — all roles passed._`);
    return lines.join("\n");
  }
  lines.push(`## Divergences`);
  lines.push("");
  for (const r of results) {
    if (!r.divergences?.length) continue;
    lines.push(`### ${r.role} — ${r.email}`);
    lines.push("");
    lines.push(`| Path | Category | Message | Screenshot |`);
    lines.push(`|------|----------|---------|------------|`);
    for (const d of r.divergences) {
      const shot = d.screenshot ? `[view](${d.screenshot})` : "—";
      const msg = (d.message ?? "").replace(/\|/g, "\\|").slice(0, 200);
      lines.push(`| \`${d.path}\` | ${d.category} | ${msg} | ${shot} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

// CLI: re-render report.md from report.json
if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFile, writeFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const src = path.join(dir, "reports", "report.json");
  const data = JSON.parse(await readFile(src, "utf8"));
  const md = renderReport(data);
  await writeFile(path.join(dir, "reports", "report.md"), md);
  console.log(md);
}
