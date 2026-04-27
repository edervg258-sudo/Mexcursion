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

    const report = {
      timestamp: new Date().toISOString(),
      totalSize,
      formattedSize,
      jsTotal: jsFiles.reduce((sum, f) => sum + f.size, 0),
      cssTotal: cssFiles.reduce((sum, f) => sum + f.size, 0),
      jsCount: jsFiles.length,
      cssCount: cssFiles.length,
      topJsFiles: jsFiles.slice(0, 5).map(f => ({
        path: f.path,
        size: formatBytes(f.size)
      })),
      topCssFiles: cssFiles.slice(0, 5).map(f => ({
        path: f.path,
        size: formatBytes(f.size)
      }))
    };

    // Write report
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

    // Console output
    console.log('\n📦 Bundle Analysis Report');
    console.log('═'.repeat(50));
    console.log(`📊 Total Bundle Size: ${report.formattedSize}`);
    console.log(`   JS Files: ${formatBytes(report.jsTotal)} (${report.jsCount} files)`);
    console.log(`   CSS Files: ${formatBytes(report.cssTotal)} (${report.cssCount} files)`);

    if (report.topJsFiles.length > 0) {
      console.log('\n🔝 Top 5 JavaScript Files:');
      report.topJsFiles.forEach((f, i) => {
        console.log(`   ${i + 1}. ${f.path} (${f.size})`);
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

    // Warn if bundle too large
    const MAX_BUNDLE_SIZE = 5 * 1024 * 1024; // 5 MB
    if (totalSize > MAX_BUNDLE_SIZE) {
      console.warn(`⚠️  Bundle size exceeded ${formatBytes(MAX_BUNDLE_SIZE)} threshold!`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message);
    process.exit(1);
  }
}

analyzeBundle();
