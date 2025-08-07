#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

    // Git operations
    console.log('\n📝 Creating git commit...');
    execSync('git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json', { stdio: 'inherit' });
    execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' });
    
    console.log('\n🏷️  Creating git tag...');
    execSync(`git tag v${newVersion}`, { stdio: 'inherit' });
    
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