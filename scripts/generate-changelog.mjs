#!/usr/bin/env node
/**
 * generate-changelog.mjs
 *
 * Runs in GitHub Actions after a push to main.
 * Detects PR merge commits, fetches PR metadata via the GitHub API,
 * asks Claude to write a human-friendly changelog entry, and prepends
 * it to CHANGELOG.md.
 *
 * Required env vars:
 *   ANTHROPIC_API_KEY  – Anthropic API key (GitHub secret)
 *   GITHUB_TOKEN       – auto-provided by GitHub Actions
 *   COMMIT_MESSAGE     – github.event.head_commit.message
 *   REPO               – github.repository  (e.g. "navybrmi/clique")
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const { ANTHROPIC_API_KEY, GITHUB_TOKEN, COMMIT_MESSAGE = '', REPO = '' } = process.env;

// ── 1. Detect PR merge commit ─────────────────────────────────────────────────
const prMatch = COMMIT_MESSAGE.match(/Merge pull request #(\d+)/);
if (!prMatch) {
  console.log('Not a PR merge commit — skipping changelog generation.');
  process.exit(0);
}
const prNumber = prMatch[1];
console.log(`Generating changelog entry for PR #${prNumber}…`);

// ── 2. Fetch PR details from GitHub API ───────────────────────────────────────
async function githubGet(path) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'clique-changelog-bot',
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}

const [pr, prCommits] = await Promise.all([
  githubGet(`/pulls/${prNumber}`),
  githubGet(`/pulls/${prNumber}/commits`),
]);

const title   = pr.title ?? '';
const body    = pr.body  ?? '(no description provided)';
const labels  = (pr.labels ?? []).map((l) => l.name).join(', ') || 'none';
const commits = prCommits
  .map((c) => `- ${c.commit.message.split('\n')[0]}`)
  .join('\n');
const mergeDate = new Date().toISOString().split('T')[0];

// ── 3. Ask Claude for a changelog entry ──────────────────────────────────────
async function callClaude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
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
  const data = await res.json();
  if (data.error) throw new Error(`Anthropic API error: ${data.error.message}`);
  return data.content[0].text.trim();
}

const prompt = `\
You are a technical writer producing a changelog entry for **Clique**, a social recommendation platform built with Next.js, React, TypeScript, and PostgreSQL.

Generate a single, well-formatted Markdown changelog entry for the following merged pull request.

---
PR #${prNumber}: ${title}
Date: ${mergeDate}
Labels: ${labels}

### PR Description
${body}

### Commits
${commits}
---

Output **only** the changelog entry itself — no preamble, no explanation.

Use this exact structure:

## [${mergeDate}] · PR #${prNumber} — ${title}

<One concise paragraph (2–4 sentences) summarising what changed and why it matters to users or contributors.>

Then include only the subsections that apply (omit the rest):

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

Rules:
- Keep bullet points short and user-focused.
- Skip low-level implementation details unless they affect behaviour.
- Write in present tense ("Add X", "Fix Y", not "Added X", "Fixed Y").
`;

const entry = await callClaude(prompt);
console.log('\nGenerated entry:\n');
console.log(entry);

// ── 4. Prepend the entry to CHANGELOG.md ─────────────────────────────────────
const CHANGELOG_PATH = 'CHANGELOG.md';
const FILE_HEADER =
  '# Changelog\n\nAll notable changes to Clique will be documented in this file.\n\n';

let existingEntries = '';
if (existsSync(CHANGELOG_PATH)) {
  const raw = readFileSync(CHANGELOG_PATH, 'utf-8');
  // Strip the fixed header so we can re-prepend it cleanly
  existingEntries = raw.startsWith(FILE_HEADER)
    ? raw.slice(FILE_HEADER.length)
    : raw;
}

const separator = '---\n\n';
writeFileSync(
  CHANGELOG_PATH,
  FILE_HEADER + entry + '\n\n' + separator + existingEntries,
  'utf-8'
);

console.log('\nCHANGELOG.md updated successfully.');
