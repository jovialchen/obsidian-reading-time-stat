#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Files to update
const MANIFEST_FILE = 'manifest.json';
const PACKAGE_FILE = 'package.json';
const VERSIONS_FILE = 'versions.json';

/**
 * Read JSON file
 */
function readJSON(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * Write JSON file
 */
function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

/**
 * Get current version from manifest
 */
function getCurrentVersion() {
    const manifest = readJSON(MANIFEST_FILE);
    return manifest.version;
}

/**
 * Parse version string to parts
 */
function parseVersion(version) {
    const [major, minor, patch] = version.split('.').map(Number);
    return { major, minor, patch };
}

/**
 * Increment version
 */
function incrementVersion(current, type) {
    const { major, minor, patch } = parseVersion(current);

    switch (type) {
        case 'major':
            return `${major + 1}.0.0`;
        case 'minor':
            return `${major}.${minor + 1}.0`;
        case 'patch':
            return `${major}.${minor}.${patch + 1}`;
        default:
            return current;
    }
}

/**
 * Update all version files
 */
function updateVersions(newVersion) {
    // Update manifest.json
    const manifest = readJSON(MANIFEST_FILE);
    manifest.version = newVersion;
    writeJSON(MANIFEST_FILE, manifest);
    console.log(`✓ Updated ${MANIFEST_FILE} to ${newVersion}`);

    // Update package.json
    const pkg = readJSON(PACKAGE_FILE);
    pkg.version = newVersion;
    writeJSON(PACKAGE_FILE, pkg);
    console.log(`✓ Updated ${PACKAGE_FILE} to ${newVersion}`);

    // Update versions.json
    const versions = readJSON(VERSIONS_FILE);
    versions[newVersion] = newVersion;
    writeJSON(VERSIONS_FILE, versions);
    console.log(`✓ Updated ${VERSIONS_FILE} with ${newVersion}`);
}

/**
 * Run shell command
 */
function runCommand(cmd, dryRun = false) {
    if (dryRun) {
        console.log(`  Would run: ${cmd}`);
        return;
    }
    try {
        execSync(cmd, { stdio: 'inherit' });
    } catch (error) {
        console.error(`Error running: ${cmd}`);
        process.exit(1);
    }
}

/**
 * Main release function
 */
async function release() {
    const currentVersion = getCurrentVersion();
    console.log(`\n📦 Current version: ${currentVersion}\n`);

    console.log('Select version bump type:');
    console.log('  1. patch  (bug fixes)');
    console.log('  2. minor  (new features)');
    console.log('  3. major  (breaking changes)');
    console.log('  4. custom (specify version)');
    console.log('  q. quit\n');

    const answer = await new Promise(resolve => {
        rl.question('Enter choice [1-4/q]: ', resolve);
    });

    let newVersion;

    switch (answer.trim()) {
        case '1':
            newVersion = incrementVersion(currentVersion, 'patch');
            break;
        case '2':
            newVersion = incrementVersion(currentVersion, 'minor');
            break;
        case '3':
            newVersion = incrementVersion(currentVersion, 'major');
            break;
        case '4':
            newVersion = await new Promise(resolve => {
                rl.question('Enter new version (e.g., 1.2.3): ', resolve);
            });
            break;
        case 'q':
        case 'Q':
            console.log('Aborted.');
            rl.close();
            return;
        default:
            console.log('Invalid choice.');
            rl.close();
            return;
    }

    console.log(`\n📝 New version will be: ${newVersion}\n`);

    const confirm = await new Promise(resolve => {
        rl.question('Continue? [y/N]: ', resolve);
    });

    if (confirm.toLowerCase() !== 'y') {
        console.log('Aborted.');
        rl.close();
        return;
    }

    rl.close();

    console.log('\n🚀 Starting release process...\n');

    // Step 1: Update versions
    console.log('Step 1: Updating version files...');
    updateVersions(newVersion);

    // Step 2: Build
    console.log('\nStep 2: Building...');
    runCommand('npm run build');

    // Step 3: Git commit
    console.log('\nStep 3: Creating git commit...');
    runCommand(`git add ${MANIFEST_FILE} ${PACKAGE_FILE} ${VERSIONS_FILE}`);
    runCommand(`git commit -m "chore: release v${newVersion}"`);

    // Step 4: Git tag
    console.log('\nStep 4: Creating git tag...');
    runCommand(`git tag -a v${newVersion} -m "Release v${newVersion}"`);

    // Step 5: Push
    console.log('\nStep 5: Pushing to remote...');
    const pushConfirm = await new Promise(resolve => {
        const rl2 = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl2.question('Push to remote? [y/N]: ', answer => {
            rl2.close();
            resolve(answer);
        });
    });

    if (pushConfirm.toLowerCase() === 'y') {
        runCommand('git push');
        runCommand('git push --tags');
        console.log('\n✅ Release v' + newVersion + ' completed!');
        console.log('\n📌 Next steps:');
        console.log('   1. Go to GitHub → Releases → Draft a new release');
        console.log('   2. Select tag: v' + newVersion);
        console.log('   3. Upload files: main.js, manifest.json, styles.css');
        console.log('   4. Publish release');
    } else {
        console.log('\n⚠️  Changes committed locally but not pushed.');
        console.log('   Run manually: git push && git push --tags');
    }
}

// Run
release().catch(console.error);