#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to get the next version based on version type
function getNextVersion(currentVersion, versionType) {
  const [major, minor, patch] = currentVersion.split('.').map(num => parseInt(num, 10));
  
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

// Main function
function main() {
  const versionType = process.argv[2] || 'patch';
  
  if (!['patch', 'minor', 'major'].includes(versionType)) {
    console.error('❌ Invalid version type. Use: patch, minor, or major');
    process.exit(1);
  }

  try {
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
    execSync('git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json src-tauri/Cargo.lock .github/workflows/test-build.yml', { stdio: 'inherit' });
    execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' });
    
    console.log('\n🏷️  Creating git tag...');
    execSync(`git tag -a v${newVersion} -m "Release version ${newVersion}"`, { stdio: 'inherit' });
    
    console.log(`\n✨ Version update complete!`);
    console.log(`📋 Next steps:`);
    console.log(`   1. Push changes: git push origin main`);
    console.log(`   2. Push tag: git push origin v${newVersion}`);
    console.log(`   3. GitHub Actions will automatically build and release`);

  } catch (error) {
    console.error('❌ Error updating version:', error.message);
    process.exit(1);
  }
}

main();