# Release Guide

## Quick Release

```bash
npm run release
```

This interactive script will:
1. Ask for version bump type (patch/minor/major/custom)
2. Update all version files
3. Build the plugin
4. Create git commit and tag
5. Optionally push to remote

## Manual Release

### 1. Update Version

Update version in these files:
- `manifest.json` → `version`
- `package.json` → `version`
- `versions.json` → add new version entry

### 2. Build

```bash
npm run build
```

### 3. Git Commit & Tag

```bash
git add manifest.json package.json versions.json
git commit -m "chore: release v1.x.x"
git tag -a v1.x.x -m "Release v1.x.x"
```

### 4. Push

```bash
git push
git push --tags
```

### 5. Create GitHub Release

1. Go to **Releases** → **Draft a new release**
2. Select the tag you just created
3. Fill in release title and notes
4. Upload these files:
   - `main.js`
   - `manifest.json`
   - `styles.css`
5. Click **Publish release**

## Submit to Obsidian Community

After first release:

1. Fork [obsidian-releases](https://github.com/obsidianmd/obsidian-releases)
2. Edit `community-plugins.json`:
   ```json
   {
     "id": "reading-time-stat",
     "name": "Reading Time Statistics",
     "author": "your-username",
     "description": "Track reading time and discover popular notes in Obsidian",
     "repo": "your-username/obsidian-reading-time-stat",
     "branch": "main"
   }
   ```
3. Submit Pull Request

## Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (x.0.0) - Breaking changes
- **MINOR** (0.x.0) - New features, backward compatible
- **PATCH** (0.0.x) - Bug fixes