#!/usr/bin/env node

// This script is a wrapper to run TypeScript files with ts-node in a CommonJS environment
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Create a temporary tsconfig for ts-node
const tempTsConfig = {
  compilerOptions: {
    target: "ES2020",
    module: "CommonJS", // Use CommonJS for ts-node compatibility
    moduleResolution: "node",
    esModuleInterop: true,
    skipLibCheck: true,
    outDir: "./dist",
    rootDir: "./src",
    baseUrl: ".",
    paths: {
      "@/*": ["src/*"],
      "@/config/*": ["src/config/*"],
      "@/middleware/*": ["src/middleware/*"],
      "@/validation/*": ["src/validation/*"],
      "@/types/*": ["src/types/*"],
      "@/api/*": ["src/api/*"],
      "@/utils/*": ["src/utils/*"]
    }
  }
};

const tempTsConfigPath = path.join(__dirname, 'tsnode-temp.json');
fs.writeFileSync(tempTsConfigPath, JSON.stringify(tempTsConfig, null, 2));

// Get the file to run from command line arguments or default to src/index.ts
const fileToRun = process.argv[2] || 'src/index.ts';

// Add NODE_OPTIONS to allow importing ESM modules
process.env.NODE_OPTIONS = '--experimental-specifier-resolution=node';

// Run ts-node with the temporary config
const result = spawnSync('npx', [
  'ts-node',
  '--transpile-only',
  '--prefer-ts-exts',
  '--project', tempTsConfigPath,
  fileToRun
], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
});

// Clean up the temporary config file
try {
  fs.unlinkSync(tempTsConfigPath);
} catch (err) {
  console.error('Failed to clean up temporary tsconfig:', err);
}

process.exit(result.status);