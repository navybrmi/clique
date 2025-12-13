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


async function isDbContainerRunning() {
  // Returns true if the db container is running
  try {
    const { spawnSync } = await import('node:child_process');
    const result = spawnSync('docker', ['compose', ...(COMPOSE_FILE ? ['-f', COMPOSE_FILE] : []), 'ps', '--status=running', '--services'], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.split(/\r?\n/).includes('db')) {
      return true;
    }
  } catch {}
  return false;
}

async function waitForDb({ host = 'localhost', port = 5432, user = 'postgres', password = 'postgres', db = 'clique', timeoutMs = 60000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await run('docker', ['exec', 'clique-db-1', 'pg_isready', '-U', user, '-d', db]);
      return;
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Timed out waiting for Postgres database to become ready');
}

async function main() {
  console.log('\n🐳 Starting Clique app container (db must be running separately)...\n');


  // Ensure db container is running
  if (!(await isDbContainerRunning())) {
    console.log('ℹ️  Database container not running. Starting db...');
    try {
      await run('docker', ['compose', ...getComposeArgs(['up', '-d', 'db'])]);
    } catch (err) {
      console.error('\n❌ Failed to start db container. Is Docker running?\n');
      console.error(String(err?.message || err));
      process.exit(1);
    }
  }

  // Wait for db to be ready
  try {
    await waitForDb();
    console.log('✅ Database is running and ready!\n');
  } catch (err) {
    console.error('\n❌ Database is not ready.');
    process.exit(1);
  }

  // Start only the app service
  try {
    await run('docker', ['compose', ...getComposeArgs(['up', '--build', '-d', 'app'])]);
  } catch (err) {
    console.error('\n❌ Failed to start app container. Is Docker running?\n');
    console.error(String(err?.message || err));
    process.exit(1);
  }

  try {
    await waitForUrl(URL, 120_000);
  } catch (err) {
    console.error(`\n❌ Docker is up, but the app did not become ready at ${URL}.\n`);
    console.error(String(err?.message || err));
    console.log('\nStopping app container...\n');
    await run('docker', ['compose', ...getComposeArgs(['down', 'app'])]).catch(() => {});
    process.exit(1);
  }

  openBrowser(URL);

  console.log(`\n✅ Clique is running!\n   ${URL}\n`);
  console.log('💡 Press "q" to stop and shut down the app container (db will keep running)\n');

  const shutdown = async () => {
    console.log('\n\n👋 Shutting down app container...\n');
    try {
      await run('docker', ['compose', ...getComposeArgs(['down', 'app'])]);
    } catch (err) {
      console.error('\n⚠️  docker compose down app failed:\n');
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
  await run('docker', ['compose', ...getComposeArgs(['down', 'app'])]).catch(() => {});
  process.exit(1);
});
