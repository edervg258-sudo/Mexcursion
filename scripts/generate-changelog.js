#!/usr/bin/env node

/**
 * Auto-generate CHANGELOG.md from git commit history
 * Parses conventional commits and groups by type
 *
 * Usage:
 *   node scripts/generate-changelog.js
 *   node scripts/generate-changelog.js --since v0.1.0  # Since tag
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SINCE_TAG = process.argv[2] === '--since' ? process.argv[3] : null;

// Get commit range
let commitRange = 'HEAD';
let previousTag = null;

try {
  if (SINCE_TAG) {
    commitRange = `${SINCE_TAG}..HEAD`;
    previousTag = SINCE_TAG;
  } else {
    // Find latest tag
    previousTag = execSync('git describe --tags --abbrev=0 2>/dev/null || echo ""', {
      encoding: 'utf-8',
    }).trim();
    if (previousTag) {
      commitRange = `${previousTag}..HEAD`;
    }
  }
} catch (e) {
  // No tags found, use all history
  commitRange = 'HEAD';
}

// Get current version
const versionFile = path.join(__dirname, '..', '.version');
const version = fs.readFileSync(versionFile, 'utf-8').trim();

// Get commits since last tag
const commits = execSync(`git log ${commitRange} --pretty=format:"%H|%s|%an|%ae|%ad" --date=short`, {
  encoding: 'utf-8',
}).split('\n').filter(Boolean);

// Parse commits by type
const parsed = {
  feat: [],
  fix: [],
  perf: [],
  chore: [],
  docs: [],
  style: [],
  refactor: [],
  test: [],
};

commits.forEach((line) => {
  const [hash, subject, author, email, date] = line.split('|');
  const match = subject.match(/^(\w+)(?:\(.+\))?: (.+)$/);

  if (!match) {
    parsed.other = parsed.other || [];
    parsed.other.push({ hash: hash.substring(0, 7), subject, author, date });
    return;
  }

  const [, type, message] = match;
  if (parsed[type]) {
    parsed[type].push({ hash: hash.substring(0, 7), message, author, date });
  } else {
    parsed.other = parsed.other || [];
    parsed.other.push({ hash: hash.substring(0, 7), subject, author, date });
  }
});

// Generate markdown
let changelog = `# Changelog\n\n`;
changelog += `All notable changes to this project are documented in this file.\n`;
changelog += `The format is based on [Keep a Changelog](https://keepachangelog.com),\n`;
changelog += `and this project adheres to [Semantic Versioning](https://semver.org).\n\n`;

// Add current version entry
if (commits.length > 0) {
  const today = new Date().toISOString().split('T')[0];
  changelog += `## [${version}] - ${today}\n\n`;

  if (parsed.feat.length > 0) {
    changelog += `### Added\n`;
    parsed.feat.forEach((commit) => {
      changelog += `- ${commit.message} ([${commit.hash}](https://github.com/edervg258/MiPrimerApp/commit/${commit.hash}))\n`;
    });
    changelog += '\n';
  }

  if (parsed.fix.length > 0) {
    changelog += `### Fixed\n`;
    parsed.fix.forEach((commit) => {
      changelog += `- ${commit.message} ([${commit.hash}](https://github.com/edervg258/MiPrimerApp/commit/${commit.hash}))\n`;
    });
    changelog += '\n';
  }

  if (parsed.perf.length > 0) {
    changelog += `### Performance\n`;
    parsed.perf.forEach((commit) => {
      changelog += `- ${commit.message} ([${commit.hash}](https://github.com/edervg258/MiPrimerApp/commit/${commit.hash}))\n`;
    });
    changelog += '\n';
  }

  if (parsed.chore.length > 0) {
    changelog += `### Changed\n`;
    parsed.chore.forEach((commit) => {
      changelog += `- ${commit.message} ([${commit.hash}](https://github.com/edervg258/MiPrimerApp/commit/${commit.hash}))\n`;
    });
    changelog += '\n';
  }

  if (parsed.docs.length > 0) {
    changelog += `### Documentation\n`;
    parsed.docs.forEach((commit) => {
      changelog += `- ${commit.message} ([${commit.hash}](https://github.com/edervg258/MiPrimerApp/commit/${commit.hash}))\n`;
    });
    changelog += '\n';
  }
}

// Append existing CHANGELOG if it exists
const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
if (fs.existsSync(changelogPath)) {
  const existing = fs.readFileSync(changelogPath, 'utf-8');
  // Remove the old header if generating fresh, append rest
  const lines = existing.split('\n');
  const contentStart = lines.findIndex((l) => l.startsWith('## ['));
  if (contentStart > 0) {
    changelog += lines.slice(contentStart).join('\n');
  }
}

// Write CHANGELOG
fs.writeFileSync(changelogPath, changelog, 'utf-8');

console.log(`✅ CHANGELOG.md generated for version ${version}`);
console.log(`   📄 ${commits.length} commits processed`);
console.log(`   ✨ Features: ${parsed.feat.length}`);
console.log(`   🐛 Fixes: ${parsed.fix.length}`);
console.log(`   ⚙️  Chores: ${parsed.chore.length}`);
console.log(`\n📝 Review and commit: git add CHANGELOG.md && git commit -m "docs: update changelog"`);
