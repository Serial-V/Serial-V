import fs from "node:fs";
import path from "node:path";

const USER = "Serial-V";

const OUT_DIR = path.resolve("assets");
fs.mkdirSync(OUT_DIR, { recursive: true });

function esc(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[m]));
}

async function gh(url) {
  const res = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github+json",
      ...(process.env.GITHUB_TOKEN ? { "Authorization": `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub API failed ${res.status}: ${url}`);
  return res.json();
}

function statsSvg({ followers, totalStars, publicRepos, totalForks, totalIssues }) {
  const cards = [
    { label: "Followers", value: followers },
    { label: "Stars", value: totalStars },
    { label: "Repos", value: publicRepos },
    { label: "Forks", value: totalForks },
    { label: "Open Issues", value: totalIssues },
  ];

  const max = Math.max(1, ...cards.map(c => Number(c.value) || 0));
  const barW = 220;

  const rows = cards.map((c, i) => {
    const v = Number(c.value) || 0;
    const target = Math.max(8, Math.round((v / max) * barW));
    const y = 78 + i * 38;

    return `
      <text x="60" y="${y}" fill="#9ca3af" font-size="14" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace">${esc(c.label)}</text>
      <text x="520" y="${y}" fill="#e5e7eb" font-size="14" text-anchor="end" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace">${esc(c.value)}</text>

      <rect x="60" y="${y + 10}" rx="7" ry="7" width="${barW}" height="10" fill="#111827" stroke="#1f2937"/>
      <rect x="60" y="${y + 10}" rx="7" ry="7" width="0" height="10" fill="url(#accent)">
        <animate attributeName="width" from="0" to="${target}" dur="1.1s" begin="${0.15 + i * 0.08}s" fill="freeze" />
      </rect>
    `;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="600" height="280" viewBox="0 0 600 280" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GitHub stats">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="100%" stop-color="#030712"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#22d3ee">
        <animate attributeName="stop-color" values="#22d3ee;#818cf8;#22d3ee" dur="4.5s" repeatCount="indefinite" />
      </stop>
      <stop offset="100%" stop-color="#818cf8">
        <animate attributeName="stop-color" values="#818cf8;#22d3ee;#818cf8" dur="4.5s" repeatCount="indefinite" />
      </stop>
    </linearGradient>

    <clipPath id="r">
      <rect x="0" y="0" width="600" height="280" rx="18" ry="18"/>
    </clipPath>

    <linearGradient id="shine" x1="-1" y1="0" x2="2" y2="0">
      <stop offset="0%" stop-color="rgba(255,255,255,0)"/>
      <stop offset="50%" stop-color="rgba(255,255,255,0.08)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>

  <g clip-path="url(#r)">
    <rect width="600" height="280" fill="url(#bg)"/>
    <rect x="-600" y="0" width="600" height="280" fill="url(#shine)">
      <animate attributeName="x" from="-600" to="1200" dur="7s" repeatCount="indefinite" />
    </rect>

    <text x="60" y="48" fill="#e5e7eb" font-size="20" font-weight="700"
      font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace">
      ${USER} • Stats
    </text>

    ${rows}

    <rect x="18" y="18" width="564" height="244" rx="16" ry="16" fill="none" stroke="#111827"/>
  </g>
</svg>`;
}

async function main() {
  const user = await gh(`https://api.github.com/users/${USER}`);
  const repos = await gh(`https://api.github.com/users/${USER}/repos?per_page=100&sort=updated`);

  let totalStars = 0;
  let totalForks = 0;
  let totalIssues = 0;

  for (const r of repos) {
    totalStars += r.stargazers_count || 0;
    totalForks += r.forks_count || 0;
    totalIssues += r.open_issues_count || 0;
  }

  const stats = statsSvg({
    followers: user.followers ?? 0,
    totalStars,
    publicRepos: user.public_repos ?? repos.length,
    totalForks,
    totalIssues,
  });

  fs.writeFileSync(path.join(OUT_DIR, "stats.svg"), stats, "utf8");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
