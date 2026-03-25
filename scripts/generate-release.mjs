#!/usr/bin/env node
/**
 * generate-release.mjs
 *
 * Triggered by GitHub Actions on every push to main.
 * When a PR merge commit is detected it:
 *   1. Fetches the PR metadata (title, body, labels, commits) from GitHub
 *   2. Reads the latest release tag and determines the next semver version
 *   3. Calls Claude to write human-friendly release notes
 *   4. Creates a GitHub Release (which also creates the git tag)
 *   5. Prepends a versioned entry to CHANGELOG.md
 *
 * Version bump rules (evaluated in order):
 *   major  — PR labels contain "major" or "breaking"
 *   minor  — PR labels contain "feat", "feature", "enhancement", or "minor"
 *            OR any commit/PR-title starts with "feat:"
 *   patch  — everything else (fix:, chore:, docs:, test:, refactor:, …)
 *
 * Required GitHub secrets:
 *   ANTHROPIC_API_KEY  – Anthropic API key
 *   (GITHUB_TOKEN is provided automatically by Actions)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const { ANTHROPIC_API_KEY, GITHUB_TOKEN, COMMIT_MESSAGE = '', REPO = '' } = process.env;

// ── 1. Detect PR merge commit ─────────────────────────────────────────────────
const prMatch = COMMIT_MESSAGE.match(/Merge pull request #(\d+)/);
if (!prMatch) {
  console.log('Not a PR merge commit — skipping release generation.');
  process.exit(0);
}
const prNumber = prMatch[1];
console.log(`Generating release for PR #${prNumber}…`);

// ── 2. GitHub API helper ──────────────────────────────────────────────────────
async function githubGet(path) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'clique-release-bot',
    },
  });
  if (!res.ok) throw new Error(`GitHub GET ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}

async function githubPost(path, body) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'clique-release-bot',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub POST ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

// ── 3. Fetch PR details ───────────────────────────────────────────────────────
const [pr, prCommits] = await Promise.all([
  githubGet(`/pulls/${prNumber}`),
  githubGet(`/pulls/${prNumber}/commits`),
]);

// ── 4. Determine next semantic version ───────────────────────────────────────
async function getLatestVersion() {
  try {
    const releases = await githubGet('/releases?per_page=1');
    return releases[0]?.tag_name ?? 'v0.0.0';
  } catch {
    return 'v0.0.0';
  }
}

function bumpVersion(tag, type) {
  const m = tag.match(/v?(\d+)\.(\d+)\.(\d+)/);
  if (!m) return 'v0.1.0';
  let [, major, minor, patch] = m.map(Number);
  if (type === 'major') { major++; minor = 0; patch = 0; }
  else if (type === 'minor') { minor++; patch = 0; }
  else { patch++; }
  return `v${major}.${minor}.${patch}`;
}

function determineBumpType(pr, commits) {
  const labelNames = (pr.labels ?? []).map((l) => l.name.toLowerCase());

  if (labelNames.some((l) => l.includes('breaking') || l.includes('major'))) return 'major';
  if (labelNames.some((l) => ['feature', 'feat', 'enhancement', 'minor'].some((k) => l.includes(k)))) return 'minor';

  const allMessages = [pr.title ?? '', ...commits.map((c) => c.commit.message)];
  if (allMessages.some((m) => /^feat[!(:].*!:|BREAKING[ -]CHANGE/i.test(m))) return 'major';
  if (allMessages.some((m) => /^feat(\(.+\))?:/i.test(m))) return 'minor';

  return 'patch';
}

const latestTag = await getLatestVersion();
const bumpType  = determineBumpType(pr, prCommits);
const newVersion = bumpVersion(latestTag, bumpType);
const releaseDate = new Date().toISOString().split('T')[0];

console.log(`  Latest tag : ${latestTag}`);
console.log(`  Bump type  : ${bumpType}`);
console.log(`  New version: ${newVersion}`);

// ── 5. Ask Claude for release notes ─────────────────────────────────────────
const commitList = prCommits
  .map((c) => `- ${c.commit.message.split('\n')[0]}`)
  .join('\n');
const labels = (pr.labels ?? []).map((l) => l.name).join(', ') || 'none';

const prompt = `\
You are a technical writer producing release notes for **Clique** — a social recommendation platform built with Next.js, React, TypeScript, and PostgreSQL.

Write release notes for version **${newVersion}** based on the merged pull request below. Use clear, friendly language that is useful to both users and contributors.

---
PR #${pr.number}: ${pr.title}
Labels: ${labels}

PR description:
${pr.body || '(no description provided)'}

Commits:
${commitList}
---

Output **only** the release notes — no preamble or explanation.

Structure:

<One concise paragraph (2–4 sentences) summarising what this release brings and why it matters.>

Include only the subsections that apply (omit empty ones):

### Added
- …

### Changed
- …

### Fixed
- …

### Removed
- …

### Security
- …

### Documentation
- …

### Tests
- …

Keep bullets short and present-tense ("Add X", "Fix Y"). Skip low-level implementation details.
`;

const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  }),
});
const claudeData = await claudeRes.json();
if (claudeData.error) throw new Error(`Anthropic API error: ${claudeData.error.message}`);
const releaseNotes = claudeData.content[0].text.trim();

console.log('\nGenerated release notes:\n');
console.log(releaseNotes);

// ── 6. Create GitHub Release (also creates the git tag) ───────────────────────
const release = await githubPost('/releases', {
  tag_name: newVersion,
  name: `${newVersion} — ${pr.title}`,
  body: releaseNotes,
  draft: false,
  prerelease: false,
});
console.log(`\nGitHub Release created: ${release.html_url}`);

// ── 7. Prepend versioned entry to CHANGELOG.md ────────────────────────────────
const CHANGELOG_PATH = 'CHANGELOG.md';
const FILE_HEADER =
  '# Changelog\n\nAll notable changes to Clique will be documented in this file.\n' +
  'Each version links to its GitHub Release.\n\n';

const changelogEntry =
  `## [${newVersion}](${release.html_url}) — ${releaseDate} · PR #${prNumber}\n\n` +
  releaseNotes;

let existingEntries = '';
if (existsSync(CHANGELOG_PATH)) {
  const raw = readFileSync(CHANGELOG_PATH, 'utf-8');
  existingEntries = raw.startsWith(FILE_HEADER) ? raw.slice(FILE_HEADER.length) : raw;
}

writeFileSync(
  CHANGELOG_PATH,
  FILE_HEADER + changelogEntry + '\n\n---\n\n' + existingEntries,
  'utf-8'
);

console.log('CHANGELOG.md updated successfully.');
