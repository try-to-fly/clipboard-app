#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to get the next version based on version type
function getNextVersion(currentVersion, versionType) {
  const [major, minor, patch] = currentVersion.split('.').map((num) => parseInt(num, 10));

  switch (versionType) {
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'major':
      return `${major + 1}.0.0`;
    default:
      throw new Error('Invalid version type. Use: patch, minor, or major');
  }
}

// Function to update package.json
function updatePackageJson(newVersion) {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  packageContent.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(packageContent, null, 2) + '\n');
  console.log(`✅ Updated package.json to version ${newVersion}`);
}

// Function to update Cargo.toml
function updateCargoToml(newVersion) {
  const cargoPath = path.join(process.cwd(), 'src-tauri', 'Cargo.toml');
  let cargoContent = fs.readFileSync(cargoPath, 'utf8');
  cargoContent = cargoContent.replace(/^version = ".*"$/m, `version = "${newVersion}"`);
  fs.writeFileSync(cargoPath, cargoContent);
  console.log(`✅ Updated Cargo.toml to version ${newVersion}`);
}

// Function to update tauri.conf.json
function updateTauriConfig(newVersion) {
  const tauriConfigPath = path.join(process.cwd(), 'src-tauri', 'tauri.conf.json');
  const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));
  tauriConfig.version = newVersion;
  fs.writeFileSync(tauriConfigPath, JSON.stringify(tauriConfig, null, 2) + '\n');
  console.log(`✅ Updated tauri.conf.json to version ${newVersion}`);
}

// Function to update Cargo.lock
function updateCargoLock(newVersion) {
  const cargoLockPath = path.join(process.cwd(), 'src-tauri', 'Cargo.lock');
  try {
    let cargoLockContent = fs.readFileSync(cargoLockPath, 'utf8');
    // Update the main package version in Cargo.lock
    cargoLockContent = cargoLockContent.replace(
      /^name = "clipboard-app"\nversion = ".*"$/m,
      `name = "clipboard-app"\nversion = "${newVersion}"`
    );
    fs.writeFileSync(cargoLockPath, cargoLockContent);
    console.log(`✅ Updated Cargo.lock to version ${newVersion}`);
  } catch (error) {
    console.warn(`⚠️  Could not update Cargo.lock: ${error.message}`);
  }
}

// Function to update GitHub Actions workflow
function updateGitHubWorkflow(newVersion) {
  const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'test-build.yml');
  try {
    let workflowContent = fs.readFileSync(workflowPath, 'utf8');
    // This is a placeholder - the workflow doesn't currently have version references
    // But we include the function for future use if version references are added
    console.log(`✅ GitHub Actions workflow checked (no version updates needed)`);
  } catch (error) {
    console.warn(`⚠️  Could not check GitHub Actions workflow: ${error.message}`);
  }
}

// Function to run code quality checks
function runQualityChecks() {
  console.log('🔍 Running code quality checks...\n');

  // Check TypeScript compilation
  console.log('📘 Checking TypeScript compilation...');
  try {
    execSync('pnpm run build', { stdio: 'inherit' });
    console.log('✅ TypeScript compilation passed\n');
  } catch (error) {
    console.error(
      '❌ TypeScript compilation failed. Please fix TypeScript errors before bumping version.'
    );
    process.exit(1);
  }

  // Check ESLint
  console.log('🔍 Running ESLint...');
  try {
    execSync('pnpm run lint', { stdio: 'inherit' });
    console.log('✅ ESLint checks passed\n');
  } catch (error) {
    console.error('❌ ESLint checks failed. Please fix linting errors before bumping version.');
    console.log('💡 Tip: Run "pnpm run lint:fix" to automatically fix some issues.');
    process.exit(1);
  }

  // Check Rust formatting
  console.log('🦀 Checking Rust formatting...');
  try {
    execSync('cd src-tauri && cargo fmt --check', { stdio: 'inherit' });
    console.log('✅ Rust formatting passed\n');
  } catch (error) {
    console.error('❌ Rust formatting check failed. Please run "cd src-tauri && cargo fmt"');
    process.exit(1);
  }

  // Check Rust with clippy
  console.log('🦀 Running Rust clippy...');
  try {
    execSync('cd src-tauri && cargo clippy -- -D warnings', { stdio: 'inherit' });
    console.log('✅ Rust clippy checks passed\n');
  } catch (error) {
    console.error('❌ Rust clippy checks failed. Please fix the warnings.');
    process.exit(1);
  }

  console.log('✨ All quality checks passed!\n');
}

// Main function
function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let versionType = 'patch';
  let autoPush = true;

  // Process arguments
  for (const arg of args) {
    if (['patch', 'minor', 'major'].includes(arg)) {
      versionType = arg;
    } else if (arg === '--no-push') {
      autoPush = false;
    } else {
      console.error(`❌ Invalid argument: ${arg}`);
      console.error('Usage: node update-version.js [patch|minor|major] [--no-push]');
      process.exit(1);
    }
  }

  try {
    // Run quality checks first
    runQualityChecks();

    // Get current version from package.json
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const currentVersion = packageContent.version;
    const newVersion = getNextVersion(currentVersion, versionType);

    console.log(`🚀 Updating version from ${currentVersion} to ${newVersion}`);

    // Update all version files
    updatePackageJson(newVersion);
    updateCargoToml(newVersion);
    updateTauriConfig(newVersion);
    updateCargoLock(newVersion);
    updateGitHubWorkflow(newVersion);

    // Git operations
    console.log('\n📝 Creating git commit...');
    execSync(
      'git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json src-tauri/Cargo.lock .github/workflows/test-build.yml',
      { stdio: 'inherit' }
    );
    execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' });

    console.log('\n🏷️  Creating git tag...');
    execSync(`git tag -a v${newVersion} -m "Release version ${newVersion}"`, { stdio: 'inherit' });

    // Auto push if enabled
    if (autoPush) {
      console.log('\n🚀 Pushing changes to remote repository...');

      try {
        // Push commits
        console.log('📤 Pushing commits to origin main...');
        execSync('git push origin main', { stdio: 'inherit' });
        console.log('✅ Commits pushed successfully');

        // Push tag
        console.log(`📤 Pushing tag v${newVersion} to origin...`);
        execSync(`git push origin v${newVersion}`, { stdio: 'inherit' });
        console.log('✅ Tag pushed successfully');

        console.log(`\n✨ Version update and push complete!`);
        console.log(`🎉 Version ${newVersion} has been released!`);
        console.log(`📦 GitHub Actions will now automatically build and create the release.`);
      } catch (pushError) {
        console.error('\n⚠️  Push failed:', pushError.message);
        console.log('📋 You can manually push with:');
        console.log(`   1. git push origin main`);
        console.log(`   2. git push origin v${newVersion}`);
      }
    } else {
      console.log(`\n✨ Version update complete!`);
      console.log(`📋 Next steps (manual push required):`);
      console.log(`   1. Push changes: git push origin main`);
      console.log(`   2. Push tag: git push origin v${newVersion}`);
      console.log(`   3. GitHub Actions will automatically build and release`);
    }
  } catch (error) {
    console.error('❌ Error updating version:', error.message);
    process.exit(1);
  }
}

main();
