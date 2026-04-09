# Roadmap & TODO List

## v1.0.0 (Current)

- [x] Basic reading time tracking
- [x] Popularity algorithm
- [x] Sidebar view with real-time updates
- [x] Popular notes modal with time range filter
- [x] Exclusion rules (folders & patterns)
- [x] Settings customization
- [x] Export/Clear statistics commands

---

## v1.0.1 - Data Integrity & Bug Fixes

### Critical: File Lifecycle Handling
> **Problem**: When files are deleted, renamed, or moved, statistics become orphaned data. The `deleteNote` method exists but is never called.

**Implementation:**
```typescript
// In main.ts onload()
this.register(this.app.vault.on('delete', (file) => {
    if (file instanceof TFile && file.extension === 'md') {
        this.statsManager.deleteNote(file.path);
        void this.saveStats();
    }
}));

this.register(this.app.vault.on('rename', (file, oldPath) => {
    if (file instanceof TFile && file.extension === 'md') {
        const stats = this.statsManager.getNoteStats(oldPath);
        if (stats) {
            // Option A: Delete old data (simple)
            this.statsManager.deleteNote(oldPath);

            // Option B: Migrate data to new path (preserve history)
            // this.statsManager.migrateNote(oldPath, file.path);
        }
        void this.saveStats();
    }
}));
```

- [ ] **Add vault event listeners for delete/rename**
- [ ] **Add `migrateNote(oldPath, newPath)` method to StatsManager** (optional, for data preservation)
- [ ] **Filter out non-existent files when displaying popular notes** (fallback safety)
- [ ] **Add "Clean orphan data" command** to manually remove stats for deleted files

### Bug: Popular Notes Click on Deleted File
> **Problem**: If a deleted file still has stats, clicking it in popular notes fails silently.

- [ ] **Verify file exists before opening** (`this.app.vault.getAbstractFileByPath(note.path)`)
- [ ] **Show warning notice if file not found**: "Note no longer exists"
- [ ] **Remove from list if file doesn't exist** (auto-cleanup on display)

---

## v1.1.0 - UX Improvements

### Visual Enhancements
- [ ] **Add "no notes tracked" state** when stats are empty (first-time user guidance)
- [ ] **Add visual indicator for excluded files** (e.g., show "Excluded" badge when viewing excluded file)
- [ ] **Add graph/chart view** for reading trends over time (optional)
- [ ] **Dark mode specific color tweaks** (verify all CSS variables work in both themes)

### Interaction Improvements
- [ ] **Double-click to open note** in popular list (currently only single click works in modal)
- [ ] **Right-click context menu** on popular note item (open in new tab, copy path, delete stats)
- [ ] **Keyboard shortcuts** in modal (arrow keys to navigate, Enter to open)
- [ ] **Search/filter in popular notes modal** (filter by note name)

### Status Bar Integration
- [ ] **Add optional status bar item** showing current session time
- [ ] **Click status bar to open sidebar view**

---

## v1.2.0 - Feature Enhancements

### Statistics Enrichment
- [ ] **Track edit time separately** from read time (`hasEdited` exists but not used in UI)
- [ ] **Show "edited" badge** for notes that were edited during reading sessions
- [ ] **Add "average session time"** metric per note
- [ ] **Track daily reading goal** (optional feature with progress bar)

### Data Analysis
- [ ] **Reading heat map** - calendar view showing reading activity per day
- [ ] **Weekly/Monthly summary** - aggregate stats notification or report
- [ ] **Most productive time** - identify peak reading hours
- [ ] **Streak tracking** - consecutive days with reading activity

### Export & Integration
- [ ] **Export as CSV** (for spreadsheet analysis)
- [ ] **Export as Markdown report** (for journaling)
- [ ] **Dataview integration** - expose stats as Dataview fields (optional)
- [ ] **Sync stats across devices** (via Obsidian Sync or custom solution)

---

## v1.3.0 - Performance & Scale

### Large Vault Optimization
> **Problem**: Vaults with thousands of notes may slow down getPopularNotes().

- [ ] **Lazy load popular notes** (paginate, load on scroll)
- [ ] **Cache popularity calculations** (recalculate only when stats change)
- [ ] **Add debounce to UI updates** (currently 2s interval, could be smarter)
- [ ] **Option to limit stats storage** (e.g., keep only top 500 notes)

### Memory Optimization
- [ ] **Lazy initialization** of tracker and stats manager
- [ ] **Clean up intervals properly** (verify no memory leaks on plugin disable)
- [ ] **Reduce save frequency** (30s interval, could save on file change only)

---

## v2.0.0 - Advanced Features

### Multi-Device Sync
- [ ] **Cloud sync for stats** (via Obsidian Sync or third-party)
- [ ] **Conflict resolution** when stats differ across devices
- [ ] **Merge algorithm** for combined reading history

### Advanced Analytics
- [ ] **AI-powered insights** - "You spend 30% more time on project notes"
- [ ] **Recommendation engine** - "You might want to revisit X note"
- [ ] **Reading pattern analysis** - identify topic clusters

### Social Features (Optional)
- [ ] **Share reading stats** - generate public report
- [ ] **Compare with community** - aggregate anonymous stats

---

## Technical Debt & Code Quality

### Testing
- [ ] **Add unit tests** for popularity calculation
- [ ] **Add unit tests** for exclusion pattern matching
- [ ] **Add integration tests** for tracker behavior
- [ ] **Add mock Obsidian API** for testing without Obsidian runtime

### Code Improvements
- [ ] **Split main.ts** into smaller modules (currently ~800 lines)
  - `main.ts` - plugin class only (~100 lines)
  - `view.ts` - sidebar view (~150 lines)
  - `modal.ts` - modal components (~150 lines)
  - `settings.ts` - settings tab (~100 lines)
- [ ] **Add proper TypeScript strict mode** (verify `noUncheckedIndexedAccess`)
- [ ] **Add JSDoc comments** for public methods
- [ ] **Add error handling** for file operations (try-catch)

### Documentation
- [ ] **Add CHANGELOG.md** for version history
- [ ] **Add CONTRIBUTING.md** with detailed guidelines
- [ ] **Add inline code comments** for complex algorithms
- [ ] **Update README** after each feature release

---

## Known Issues

| Issue | Severity | Status |
|-------|----------|--------|
| Deleted/renamed files leave orphan stats | High | Planned for v1.0.1 |
| Clicking deleted file in popular list fails | Medium | Planned for v1.0.1 |
| No visual feedback when viewing excluded file | Low | Planned for v1.1.0 |
| Main.ts file too large (800+ lines) | Low | Planned for refactor |

---

## Contributing

If you'd like to contribute to any of these features:

1. Check the issue tracker on GitHub
2. Comment on the issue you want to work on
3. Submit a PR with tests and documentation

Priority order:
1. **v1.0.1** - Data integrity (critical)
2. **v1.1.0** - UX polish
3. **v1.2.0** - New features
4. **v1.3.0** - Performance
5. **v2.0.0** - Advanced features