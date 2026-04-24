#!/usr/bin/env node

/**
 * Semantic Version Bumper
 * Updates version in package.json and .version file
 *
 * Usage:
 *   node scripts/bump-version.js patch  # 0.1.0 -> 0.1.1
 *   node scripts/bump-version.js minor  # 0.1.0 -> 0.2.0
 *   node scripts/bump-version.js major  # 0.1.0 -> 1.0.0
 */

const fs = require('fs');
const path = require('path');

const BUMP_TYPE = process.argv[2];
const VALID_BUMPS = ['major', 'minor', 'patch'];

if (!BUMP_TYPE || !VALID_BUMPS.includes(BUMP_TYPE)) {
  console.error(`❌ Usage: node scripts/bump-version.js <${VALID_BUMPS.join('|')}>`);
  process.exit(1);
}

// Read current version from .version file
const versionFilePath = path.join(__dirname, '..', '.version');
const currentVersion = fs.readFileSync(versionFilePath, 'utf-8').trim();

// Parse version
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Calculate new version
let newVersion;
if (BUMP_TYPE === 'major') {
  newVersion = `${major + 1}.0.0`;
} else if (BUMP_TYPE === 'minor') {
  newVersion = `${major}.${minor + 1}.0`;
} else {
  newVersion = `${major}.${minor}.${patch + 1}`;
}

// Update .version file
fs.writeFileSync(versionFilePath, newVersion + '\n', 'utf-8');

// Update package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');

console.log(`✅ Bumped version: ${currentVersion} → ${newVersion} (${BUMP_TYPE})`);
console.log(`\n📝 Next steps:`);
console.log(`   1. git add .version package.json`);
console.log(`   2. git commit -m "chore: bump version to ${newVersion}"`);
console.log(`   3. npm run release:preflight`);
console.log(`   4. scripts/tag-release.sh v${newVersion}`);
