#!/usr/bin/env node

import { spawn } from 'node:child_process';
import http from 'node:http';
import https from 'node:https';

const URL = process.env.DOCKER_APP_URL || 'http://localhost:3000';
const COMPOSE_FILE = process.env.DOCKER_COMPOSE_FILE || undefined;

/**
 * Run a command and resolve/reject on exit.
 * @param {string} command
 * @param {string[]} args
 * @param {{ stdio?: any }} options
 * @returns {Promise<void>}
 */
function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

/**
 * Fetch a URL and resolve true if HTTP 200-399.
 * @param {string} url
 * @returns {Promise<boolean>}
 */
function probe(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.request(url, { method: 'GET' }, (res) => {
      const ok = (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 400;
      res.resume();
      resolve(ok);
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

/**
 * Wait until URL responds OK or timeout.
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<void>}
 */
async function waitForUrl(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await probe(url);
    if (ok) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

/**
 * Open the URL in the default browser.
 * Best-effort.
 * @param {string} url
 */
function openBrowser(url) {
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  try {
    const child = spawn(opener, [url], { stdio: 'ignore' });
    child.unref();
  } catch {
    // ignore
  }
}

function getComposeArgs(baseArgs) {
  if (!COMPOSE_FILE) return baseArgs;
  return ['-f', COMPOSE_FILE, ...baseArgs];
}

async function main() {
  console.log('\n🐳 Starting Clique with Docker...\n');

  try {
    await run('docker', ['compose', ...getComposeArgs(['up', '--build', '-d'])]);
  } catch (err) {
    console.error('\n❌ Failed to start Docker Compose. Is Docker running?\n');
    console.error(String(err?.message || err));
    process.exit(1);
  }

  try {
    await waitForUrl(URL, 120_000);
  } catch (err) {
    console.error(`\n❌ Docker is up, but the app did not become ready at ${URL}.\n`);
    console.error(String(err?.message || err));
    console.log('\nStopping containers...\n');
    await run('docker', ['compose', ...getComposeArgs(['down'])]).catch(() => {});
    process.exit(1);
  }

  openBrowser(URL);

  console.log(`\n✅ Clique is running!\n   ${URL}\n`);
  console.log('💡 Press "q" to stop and shut down Docker Compose\n');

  const shutdown = async () => {
    console.log('\n\n👋 Shutting down Docker Compose...\n');
    try {
      await run('docker', ['compose', ...getComposeArgs(['down'])]);
    } catch (err) {
      console.error('\n⚠️  docker compose down failed:\n');
      console.error(String(err?.message || err));
      process.exit(1);
    }
    process.exit(0);
  };

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (key) => {
    if (key === 'q' || key === 'Q' || key === '\u0003') {
      shutdown();
    }
  });

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(async (err) => {
  console.error(String(err?.message || err));
  await run('docker', ['compose', ...getComposeArgs(['down'])]).catch(() => {});
  process.exit(1);
});
