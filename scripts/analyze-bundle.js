#!/usr/bin/env node

/**
 * Bundle Size Analysis Script
 *
 * Analyzes the web bundle size after Expo export and logs results.
 * Saves a JSON report for CI/CD pipeline to use in PR comments.
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '../dist');
const REPORT_FILE = path.join(__dirname, '../bundle-report.json');

function getDirectorySize(dirPath) {
  let size = 0;
  const files = fs.readdirSync(dirPath, { withFileTypes: true });

  files.forEach(file => {
    const fullPath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      size += getDirectorySize(fullPath);
    } else {
      const stats = fs.statSync(fullPath);
      size += stats.size;
    }
  });

  return size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function analyzeBundle() {
  try {
    if (!fs.existsSync(DIST_DIR)) {
      console.error(`❌ Bundle directory not found: ${DIST_DIR}`);
      process.exit(1);
    }

    const totalSize = getDirectorySize(DIST_DIR);
    const formattedSize = formatBytes(totalSize);

    // Analyze key files
    const jsFiles = [];
    const cssFiles = [];

    function scanFiles(dirPath) {
      const files = fs.readdirSync(dirPath, { withFileTypes: true });

      files.forEach(file => {
        const fullPath = path.join(dirPath, file.name);
        const relativePath = path.relative(DIST_DIR, fullPath);

        if (file.isDirectory()) {
          scanFiles(fullPath);
        } else {
          const stats = fs.statSync(fullPath);
          if (file.name.endsWith('.js') || file.name.endsWith('.mjs')) {
            jsFiles.push({ path: relativePath, size: stats.size });
          } else if (file.name.endsWith('.css')) {
            cssFiles.push({ path: relativePath, size: stats.size });
          }
        }
      });
    }

    scanFiles(DIST_DIR);

    // Sort by size
    jsFiles.sort((a, b) => b.size - a.size);
    cssFiles.sort((a, b) => b.size - a.size);

    const jsTotal = jsFiles.reduce((sum, f) => sum + f.size, 0);
    const cssTotal = cssFiles.reduce((sum, f) => sum + f.size, 0);

    // Per-chunk limit: no single JS file should exceed 500 KB (gzip ~150 KB)
    const MAX_CHUNK_SIZE = 500 * 1024;
    const oversizedChunks = jsFiles.filter(f => f.size > MAX_CHUNK_SIZE);

    const report = {
      timestamp: new Date().toISOString(),
      totalSize,
      formattedSize,
      jsTotal,
      cssTotal,
      jsCount: jsFiles.length,
      cssCount: cssFiles.length,
      topJsFiles: jsFiles.slice(0, 5).map(f => ({
        path: f.path,
        size: formatBytes(f.size),
        bytes: f.size,
      })),
      topCssFiles: cssFiles.slice(0, 5).map(f => ({
        path: f.path,
        size: formatBytes(f.size),
        bytes: f.size,
      })),
      oversizedChunks: oversizedChunks.map(f => ({
        path: f.path,
        size: formatBytes(f.size),
        bytes: f.size,
      })),
    };

    // Write report
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

    // Console output
    console.log('\n📦 Bundle Analysis Report');
    console.log('═'.repeat(50));
    console.log(`📊 Total Bundle Size: ${report.formattedSize}`);
    console.log(`   JS Files: ${formatBytes(jsTotal)} (${report.jsCount} files)`);
    console.log(`   CSS Files: ${formatBytes(cssTotal)} (${report.cssCount} files)`);

    if (report.topJsFiles.length > 0) {
      console.log('\n🔝 Top 5 JavaScript Files:');
      report.topJsFiles.forEach((f, i) => {
        const flag = f.bytes > MAX_CHUNK_SIZE ? ' ⚠️  EXCEEDS CHUNK LIMIT' : '';
        console.log(`   ${i + 1}. ${f.path} (${f.size})${flag}`);
      });
    }

    if (report.topCssFiles.length > 0) {
      console.log('\n🎨 Top 5 CSS Files:');
      report.topCssFiles.forEach((f, i) => {
        console.log(`   ${i + 1}. ${f.path} (${f.size})`);
      });
    }

    console.log('\n✅ Bundle report saved to: ' + REPORT_FILE);
    console.log('═'.repeat(50) + '\n');

    let exitCode = 0;

    // Total bundle limit: 8 MB (accounts for Expo + Stripe + Supabase baseline)
    const MAX_BUNDLE_SIZE = 8 * 1024 * 1024;
    if (totalSize > MAX_BUNDLE_SIZE) {
      console.error(`❌ Total bundle size (${formatBytes(totalSize)}) exceeds ${formatBytes(MAX_BUNDLE_SIZE)} limit`);
      exitCode = 1;
    }

    // Per-chunk limit: flag JS files over 500 KB
    if (oversizedChunks.length > 0) {
      console.error(`❌ ${oversizedChunks.length} JS chunk(s) exceed ${formatBytes(MAX_CHUNK_SIZE)} limit:`);
      oversizedChunks.forEach(f => console.error(`   • ${f.path} (${f.size})`));
      exitCode = 1;
    }

    if (exitCode !== 0) process.exit(exitCode);
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message);
    process.exit(1);
  }
}

analyzeBundle();
