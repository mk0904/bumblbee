import { existsSync } from 'node:fs';
import { homedir, platform, arch } from 'node:os';
import { spawnSync } from 'node:child_process';

function version(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  return result.error || result.status !== 0
    ? 'not found'
    : result.stdout.trim() || result.stderr.trim();
}
const candidates = [
  process.env.WEBOTS_HOME,
  '/Applications/Webots.app',
  `${homedir()}/Applications/Webots.app`,
].filter(Boolean);
console.info(
  JSON.stringify(
    {
      system: `${platform()} ${arch()}`,
      node: process.version,
      npm: version('npm', ['--version']),
      python: version('python3', ['--version']),
      webots: candidates.find((path) => existsSync(path)) ?? version('webots', ['--version']),
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      nextGate: 'Local Webots takeoff, hover, target navigation and landing; not yet verified',
    },
    null,
    2,
  ),
);
