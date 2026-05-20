import {
    App,
    ItemView,
    Menu,
    Modal,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting,
    TAbstractFile,
    TFile,
    WorkspaceLeaf,
} from 'obsidian';
import type { ReadingTimeStatSettings, StatsData, PopularNote, TimeRange } from './types';
import { DEFAULT_SETTINGS, TIME_RANGE_OPTIONS } from './types';
import { StatsManager } from './stats';
import { ReadingTimeTracker } from './tracker';
import { getPopularNotes, formatReadingTime, formatLastVisited } from './popularity';
import { shouldExclude } from './exclusions';
import { AnalyticsModal } from './analytics';

const VIEW_TYPE = 'reading-time-stat-view';

/**
 * Reading Time Statistics Plugin
 */
export default class ReadingTimeStatPlugin extends Plugin {
    private settings: ReadingTimeStatSettings;
    private statsManager: StatsManager;
    private tracker: ReadingTimeTracker;
    private statusBarEl: HTMLElement | null = null;

    async onload() {
        // Load all plugin data (settings + stats)
        const savedData = await this.loadData();

        // Extract settings
        this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData?.settings);

        // Extract stats data
        const statsData = savedData?.stats as StatsData | null;
        this.statsManager = new StatsManager(statsData, this.settings);

        // Initialize tracker with update callback
        this.tracker = new ReadingTimeTracker(
            this.app,
            this.statsManager,
            this.settings,
            this.saveStats.bind(this),
            () => {
                const view = this.getView();
                if (view) {
                    view.update();
                }
                this.updateStatusBar();
            }
        );

        // Register view
        this.registerView(VIEW_TYPE, (leaf) => new ReadingTimeStatView(leaf, this));

        // Add ribbon icon
        this.addRibbonIcon('rose', 'Reading time stats', () => {
            void this.activateView();
        });

        // Add commands
        this.addCommand({
            id: 'open-stats-view',
            name: 'Open statistics view',
            callback: () => this.activateView(),
        });

        this.addCommand({
            id: 'show-popular-notes',
            name: 'Show popular notes',
            callback: () => this.showPopularNotesModal(),
        });

        this.addCommand({
            id: 'export-stats',
            name: 'Export statistics',
            callback: () => this.exportStats(),
        });

        this.addCommand({
            id: 'clear-stats',
            name: 'Clear all statistics',
            callback: () => this.confirmClearStats(),
        });

        this.addCommand({
            id: 'clean-orphan-stats',
            name: 'Clean orphan data',
            callback: () => this.cleanOrphanStats(),
        });

        this.addCommand({
            id: 'show-analytics',
            name: 'Show reading analytics',
            callback: () => this.showAnalyticsModal(),
        });

        // Add settings tab
        this.addSettingTab(new ReadingTimeStatSettingTab(this.app, this));

        // Status bar item (optional)
        this.setupStatusBar();

        // Start tracking
        this.tracker.start();

        // Register vault event listeners for file lifecycle handling
        this.registerEvent(
            this.app.vault.on('delete', (file: TAbstractFile) => {
                if (file instanceof TFile && file.extension === 'md') {
                    this.tracker.handleFileDeleted(file.path);
                    if (this.statsManager.deleteNote(file.path)) {
                        void this.saveStats();
                        this.getView()?.update();
                    }
                }
            })
        );

        this.registerEvent(
            this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
                if (file instanceof TFile && file.extension === 'md') {
                    this.tracker.handleFileRenamed(oldPath, file);
                    if (this.statsManager.migrateNote(oldPath, file.path)) {
                        void this.saveStats();
                        this.getView()?.update();
                    }
                }
            })
        );

        // Register for cleanup on plugin unload
        this.register(() => this.tracker.stop());
    }

    onunload(): void {
        this.tracker.stop();
        void this.saveStats();
    }

    /**
     * Save stats data to disk
     */
    async saveStats(): Promise<void> {
        await this.saveData({
            settings: this.settings,
            stats: this.statsManager.getData(),
        });
    }

    /**
     * Save settings only
     */
    async saveSettings(): Promise<void> {
        await this.saveStats();
    }

    /**
     * Activate the stats view
     */
    async activateView(): Promise<void> {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE);

        if (leaves.length > 0) {
            // Already open, focus it
            leaf = leaves[0];
        } else {
            // Open in right sidebar
            leaf = workspace.getRightLeaf(false);
            if (leaf) {
                await leaf.setViewState({ type: VIEW_TYPE, active: true });
            }
        }

        if (leaf) {
            void workspace.revealLeaf(leaf);
        }
    }

    /**
 * Show popular notes in a modal
     */
    private showPopularNotesModal(timeRange: TimeRange = 'all'): void {
        const popularNotes = getPopularNotes(
            this.statsManager.getAllNotes(),
            this.settings,
            this.settings.popularNotesLimit,
            timeRange
        );

        new PopularNotesModal(this.app, this, popularNotes, this.settings, this.statsManager, timeRange).open();
    }

    /**
     * Export statistics as JSON
     */
    private async exportStats(): Promise<void> {
        const data = {
            exportedAt: new Date().toISOString(),
            settings: this.settings,
            stats: this.statsManager.getData(),
            summary: this.statsManager.getSummary(),
        };

        const fileName = `reading-stats-${new Date().toISOString().split('T')[0]}.json`;
        const filePath = `${this.app.vault.configDir}/plugins/reading-time-stat/${fileName}`;

        await this.app.vault.adapter.write(filePath, JSON.stringify(data, null, 2));
        new Notice(`Stats exported to ${fileName}`);
    }

    /**
     * Confirm and clear all statistics
     */
    private confirmClearStats(): void {
        new ConfirmModal(
            this.app,
            'Clear all statistics',
            'This will permanently delete all reading time statistics. Are you sure?',
            async () => {
                this.statsManager.clearAll();
                await this.saveStats();
                const view = this.getView();
                if (view) {
                    view.update();
                }
                new Notice('All statistics cleared');
            }
        ).open();
    }

    /**
     * Remove stats for files that no longer exist in the vault
     */
    private async cleanOrphanStats(): Promise<void> {
        const existingPaths = new Set(
            this.app.vault.getMarkdownFiles().map((f) => f.path)
        );
        const removed = this.statsManager.removeOrphans(existingPaths);
        if (removed > 0) {
            await this.saveStats();
            this.getView()?.update();
            new Notice(`Removed stats for ${removed} missing note${removed === 1 ? '' : 's'}`);
        } else {
            new Notice('No orphan stats found');
        }
    }

    /**
     * Show reading analytics modal with heatmap and insights.
     */
    showAnalyticsModal(): void {
        new AnalyticsModal(this.app, this.statsManager, this.settings).open();
    }

    /**
     * Open a note by path, verifying it exists in the vault.
     * Returns true if the file was opened.
     */
    openNoteIfExists(path: string): boolean {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
            void this.app.workspace.openLinkText(path, '', true);
            return true;
        }
        new Notice('Note no longer exists');
        // Auto-cleanup the orphan entry
        if (this.statsManager.deleteNote(path)) {
            void this.saveStats();
            this.getView()?.update();
        }
        return false;
    }

    /**
     * Show a context menu for a popular note item.
     */
    showNoteContextMenu(event: MouseEvent, path: string, onChange?: () => void): void {
        const menu = new Menu();
        const file = this.app.vault.getAbstractFileByPath(path);

        menu.addItem((item) =>
            item
                .setTitle('Open')
                .setIcon('file')
                .onClick(() => {
                    this.openNoteIfExists(path);
                })
        );

        menu.addItem((item) =>
            item
                .setTitle('Open in new tab')
                .setIcon('lucide-external-link')
                .onClick(() => {
                    if (file instanceof TFile) {
                        void this.app.workspace.getLeaf('tab').openFile(file);
                    } else {
                        this.openNoteIfExists(path);
                    }
                })
        );

        menu.addItem((item) =>
            item
                .setTitle('Copy path')
                .setIcon('lucide-copy')
                .onClick(() => {
                    void navigator.clipboard.writeText(path);
                    new Notice('Path copied');
                })
        );

        menu.addSeparator();

        menu.addItem((item) =>
            item
                .setTitle('Delete stats for this note')
                .setIcon('lucide-trash-2')
                .onClick(async () => {
                    if (this.statsManager.deleteNote(path)) {
                        await this.saveStats();
                        this.getView()?.update();
                        onChange?.();
                        new Notice('Stats deleted');
                    }
                })
        );

        menu.showAtMouseEvent(event);
    }

    /**
     * Create or remove the status bar item based on settings.
     */
    setupStatusBar(): void {
        if (this.settings.showStatusBar) {
            if (!this.statusBarEl) {
                this.statusBarEl = this.addStatusBarItem();
                this.statusBarEl.addClass('reading-time-stat-status');
                this.statusBarEl.setAttr('aria-label', 'Open reading time stats');
                this.statusBarEl.addEventListener('click', () => {
                    void this.activateView();
                });
            }
            this.updateStatusBar();
        } else if (this.statusBarEl) {
            this.statusBarEl.remove();
            this.statusBarEl = null;
        }
    }

    /**
     * Refresh the status bar with the current session time.
     */
    updateStatusBar(): void {
        if (!this.statusBarEl) return;
        const status = this.tracker.getStatus();
        if (status.filePath) {
            this.statusBarEl.setText(`📖 ${formatReadingTime(status.currentSessionTime)}`);
            this.statusBarEl.style.cursor = 'pointer';
        } else {
            this.statusBarEl.setText('📖 —');
            this.statusBarEl.style.cursor = 'pointer';
        }
    }

    /**
     * Get stats manager for view access
     */
    getStatsManager(): StatsManager {
        return this.statsManager;
    }

    /**
     * Get settings for view access
     */
    getSettings(): ReadingTimeStatSettings {
        return this.settings;
    }

    /**
     * Get tracker for real-time status
     */
    getTracker(): ReadingTimeTracker {
        return this.tracker;
    }

    /**
     * Get the view instance if it exists
     */
    getView(): ReadingTimeStatView | null {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
        if (leaves.length > 0 && leaves[0].view instanceof ReadingTimeStatView) {
            return leaves[0].view;
        }
        return null;
    }
}

/**
 * Statistics Sidebar View
 */
class ReadingTimeStatView extends ItemView {
    private plugin: ReadingTimeStatPlugin;
    private currentTimeRange: TimeRange = 'all';

    constructor(leaf: WorkspaceLeaf, plugin: ReadingTimeStatPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    private formatHour12(hour: number): string {
        if (hour === 0) return '12a';
        if (hour < 12) return `${hour}a`;
        if (hour === 12) return '12p';
        return `${hour - 12}p`;
    }

    getViewType(): string {
        return VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'Reading time stats';
    }

    getIcon(): string {
        return 'rose';
    }

    onOpen(): Promise<void> {
        this.update();
        return Promise.resolve();
    }

    onClose(): Promise<void> {
        // Cleanup
        return Promise.resolve();
    }

    destroy(): void {
        // Additional cleanup if needed
    }

    /**
     * Update the view content
     */
    update(): void {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('reading-time-stat-container');

        const summary = this.plugin.getStatsManager().getSummary();

        // Empty / first-time guidance state
        if (summary.totalNotes === 0) {
            const empty = container.createDiv({ cls: 'rts-empty-state' });
            empty.createEl('div', { text: '📖', cls: 'rts-empty-icon' });
            empty.createEl('h3', { text: 'No notes tracked yet' });
            empty.createEl('p', {
                text: 'Open and read any markdown note to start tracking your reading time. Stats appear here automatically.',
            });
            empty.createEl('p', {
                text: `Sessions count once you read for at least ${this.plugin.getSettings().minSessionTime} seconds.`,
                cls: 'rts-empty-hint',
            });
            return;
        }

        // Summary section
        const summaryDiv = container.createDiv({ cls: 'stats-summary' });
        summaryDiv.createEl('h3', { text: 'Overview' });
        summaryDiv.createEl('p', {
            text: `Tracking ${summary.totalNotes} notes`,
        });
        summaryDiv.createEl('p', {
            text: `Total time: ${formatReadingTime(summary.totalTimeSeconds)}`,
        });
        summaryDiv.createEl('p', {
            text: `${summary.totalSessions} reading sessions`,
        });

        // Streak and peak hour
        const streak = this.plugin.getStatsManager().getStreak();
        const peak = this.plugin.getStatsManager().getMostProductiveHour();
        const streakLine = summaryDiv.createEl('p', { cls: 'rts-summary-streak' });
        streakLine.createEl('span', { text: `🔥 ${streak.current} day streak` });
        if (peak) {
            streakLine.createEl('span', { text: ' · ' });
            streakLine.createEl('span', { text: `⏰ ${this.formatHour12(peak.hour)} peak` });
        }

        // Analytics button
        const analyticsBtn = summaryDiv.createEl('button', {
            text: 'View Analytics & Heatmap',
            cls: 'rts-analytics-btn',
        });
        analyticsBtn.addEventListener('click', () => {
            this.plugin.showAnalyticsModal();
        });

        // Time range selector
        const filterDiv = container.createDiv({ cls: 'time-range-filter' });
        filterDiv.createEl('span', { text: 'Time range: ', cls: 'filter-label' });

        const select = filterDiv.createEl('select', { cls: 'time-range-select' });
        for (const option of TIME_RANGE_OPTIONS) {
            const optEl = select.createEl('option', {
                value: option.value,
                text: option.label,
            });
            if (option.value === this.currentTimeRange) {
                optEl.selected = true;
            }
        }

        select.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            this.currentTimeRange = target.value as TimeRange;
            this.update();
        });

        // Popular notes section
        const allPopularNotes = getPopularNotes(
            this.plugin.getStatsManager().getAllNotes(),
            this.plugin.getSettings(),
            this.plugin.getSettings().popularNotesLimit,
            this.currentTimeRange
        );

        // Fallback safety: filter out notes whose files no longer exist
        const popularNotes = allPopularNotes.filter((note) =>
            this.app.vault.getAbstractFileByPath(note.path) !== null
        );

        const popularDiv = container.createDiv({ cls: 'popular-notes' });
        const rangeLabel = TIME_RANGE_OPTIONS.find(o => o.value === this.currentTimeRange)?.label || 'All Time';
        popularDiv.createEl('h3', { text: 'Popular notes' });
        popularDiv.createEl('span', {
            text: rangeLabel,
            cls: 'time-range-badge',
        });

        if (popularNotes.length === 0) {
            popularDiv.createEl('p', {
                text: 'No statistics for this time range.',
                cls: 'no-stats',
            });
        } else {
            const list = popularDiv.createEl('ul', { cls: 'popular-list' });
            for (let i = 0; i < popularNotes.length; i++) {
                const note = popularNotes[i];
                const item = list.createEl('li', { cls: 'popular-item' });

                // Rank badge
                const rankBadge = item.createEl('span', { cls: 'rank-badge' });
                rankBadge.textContent = `#${i + 1}`;
                if (i === 0) rankBadge.addClass('rank-first');
                else if (i === 1) rankBadge.addClass('rank-second');
                else if (i === 2) rankBadge.addClass('rank-third');

                // Note name (clickable)
                const link = item.createEl('a', {
                    text: note.name,
                    cls: 'note-name',
                });
                link.addEventListener('click', () => {
                    this.plugin.openNoteIfExists(note.path);
                });
                // Double-click also opens (consistent with modal)
                link.addEventListener('dblclick', (e) => {
                    e.preventDefault();
                    this.plugin.openNoteIfExists(note.path);
                });
                // Context menu (right-click)
                item.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.plugin.showNoteContextMenu(e, note.path, () => this.update());
                });

                // Stats row
                const statsRow = item.createDiv({ cls: 'stats-row' });
                statsRow.createEl('span', {
                    text: formatReadingTime(note.stats.totalReadingTime),
                    cls: 'stat-item stat-time',
                });
                statsRow.createEl('span', {
                    text: `${note.stats.readingCount}`,
                    cls: 'stat-item stat-count',
                });
                statsRow.createEl('span', {
                    text: formatLastVisited(note.stats.lastReadAt),
                    cls: 'stat-item stat-date',
                });
            }
        }

        // Current tracking status (real-time)
        const trackingStatus = this.plugin.getTracker().getStatus();
        const trackingDiv = container.createDiv({ cls: 'current-note-stats' });
        trackingDiv.createEl('h3', { text: 'Currently tracking' });

        if (trackingStatus.filePath) {
            const fileName = trackingStatus.filePath.split('/').pop()?.replace(/\.md$/, '') || trackingStatus.filePath;
            trackingDiv.createEl('p', {
                text: fileName,
                cls: 'current-file-name',
            });

            // Stats grid
            const statsGrid = trackingDiv.createDiv({ cls: 'tracking-stats-grid' });

            const sessionDiv = statsGrid.createDiv({ cls: 'stat-box' });
            sessionDiv.createEl('span', { text: 'Session', cls: 'stat-label' });
            sessionDiv.createEl('span', {
                text: formatReadingTime(trackingStatus.currentSessionTime),
                cls: 'stat-value live',
            });

            const totalDiv = statsGrid.createDiv({ cls: 'stat-box' });
            totalDiv.createEl('span', { text: 'Total', cls: 'stat-label' });
            totalDiv.createEl('span', {
                text: formatReadingTime(trackingStatus.totalTime),
                cls: 'stat-value',
            });

            // Show existing stats if available
            const existingStats = this.plugin.getStatsManager().getNoteStats(trackingStatus.filePath);
            if (existingStats) {
                const sessionsDiv = statsGrid.createDiv({ cls: 'stat-box' });
                sessionsDiv.createEl('span', { text: 'Sessions', cls: 'stat-label' });
                sessionsDiv.createEl('span', {
                    text: String(existingStats.readingCount + 1),
                    cls: 'stat-value',
                });

                trackingDiv.createEl('p', {
                    text: `First read: ${new Date(existingStats.firstReadAt).toLocaleDateString()}`,
                    cls: 'first-read-date',
                });
            } else {
                trackingDiv.createEl('p', {
                    text: 'First time reading this note',
                    cls: 'first-time',
                });
            }
        } else {
            // Distinguish between excluded vs no markdown active
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile && activeFile.extension === 'md' && shouldExclude(activeFile.path, this.plugin.getSettings())) {
                const excluded = trackingDiv.createDiv({ cls: 'no-tracking excluded' });
                excluded.createEl('span', {
                    text: 'Excluded',
                    cls: 'excluded-badge',
                });
                excluded.createEl('span', {
                    text: ' This note matches an exclusion rule.',
                });
            } else {
                trackingDiv.createEl('p', {
                    text: 'No Markdown file active',
                    cls: 'no-tracking',
                });
            }
        }
    }
}

/**
 * Popular Notes Modal
 */
class PopularNotesModal extends Modal {
    private plugin: ReadingTimeStatPlugin;
    private notes: PopularNote[];
    private filteredNotes: PopularNote[] = [];
    private settings: ReadingTimeStatSettings;
    private statsManager: StatsManager;
    private currentTimeRange: TimeRange;
    private tableContainer: HTMLDivElement | null = null;
    private searchQuery: string = '';
    private selectedIndex: number = 0;
    private rowEls: HTMLTableRowElement[] = [];
    private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;

    constructor(
        app: App,
        plugin: ReadingTimeStatPlugin,
        notes: PopularNote[],
        settings: ReadingTimeStatSettings,
        statsManager: StatsManager,
        timeRange: TimeRange = 'all'
    ) {
        super(app);
        this.plugin = plugin;
        this.notes = notes;
        this.settings = settings;
        this.statsManager = statsManager;
        this.currentTimeRange = timeRange;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.addClass('popular-notes-modal');

        contentEl.createEl('h2', { text: 'Popular notes ranking' });

        // Time range selector
        const filterDiv = contentEl.createDiv({ cls: 'modal-filter' });
        filterDiv.createEl('span', { text: 'Time range: ', cls: 'filter-label' });

        const select = filterDiv.createEl('select', { cls: 'time-range-select' });
        for (const option of TIME_RANGE_OPTIONS) {
            const optEl = select.createEl('option', {
                value: option.value,
                text: option.label,
            });
            if (option.value === this.currentTimeRange) {
                optEl.selected = true;
            }
        }

        select.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            this.currentTimeRange = target.value as TimeRange;
            this.updateNotes();
        });

        // Search input
        const searchInput = filterDiv.createEl('input', {
            cls: 'modal-search-input',
            type: 'search',
            attr: { placeholder: 'Search notes…' },
        });
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
            this.applyFilter();
        });

        // Table container for dynamic updates
        this.tableContainer = contentEl.createDiv({ cls: 'table-container' });

        // Apply initial filter for non-existent files and render
        this.updateNotes();

        // Keyboard navigation
        this.boundKeyHandler = (e: KeyboardEvent) => this.handleKeydown(e);
        contentEl.addEventListener('keydown', this.boundKeyHandler);
        // Allow the modal to receive focus for keys when no input focused
        contentEl.tabIndex = 0;
    }

    /**
     * Update notes when time range changes
     */
    private updateNotes(): void {
        const all = getPopularNotes(
            this.statsManager.getAllNotes(),
            this.settings,
            this.settings.popularNotesLimit,
            this.currentTimeRange
        );
        // Fallback safety: filter out notes whose files no longer exist
        this.notes = all.filter((note) =>
            this.app.vault.getAbstractFileByPath(note.path) !== null
        );
        this.applyFilter();
    }

    /**
     * Apply text search filter to notes and re-render.
     */
    private applyFilter(): void {
        const q = this.searchQuery.trim();
        this.filteredNotes = q
            ? this.notes.filter((n) =>
                n.name.toLowerCase().includes(q) || n.path.toLowerCase().includes(q)
            )
            : this.notes.slice();
        this.selectedIndex = 0;
        if (this.tableContainer) {
            this.tableContainer.empty();
            this.renderTable();
        }
    }

    /**
     * Handle keyboard navigation.
     */
    private handleKeydown(e: KeyboardEvent): void {
        if (this.filteredNotes.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredNotes.length - 1);
            this.refreshSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
            this.refreshSelection();
        } else if (e.key === 'Enter') {
            const note = this.filteredNotes[this.selectedIndex];
            if (note) {
                e.preventDefault();
                if (this.plugin.openNoteIfExists(note.path)) {
                    this.close();
                } else {
                    this.updateNotes();
                }
            }
        }
    }

    private refreshSelection(): void {
        for (let i = 0; i < this.rowEls.length; i++) {
            this.rowEls[i].toggleClass('rts-row-selected', i === this.selectedIndex);
        }
        this.rowEls[this.selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }

    /**
     * Render the notes table
     */
    private renderTable(): void {
        if (!this.tableContainer) return;
        this.rowEls = [];

        if (this.filteredNotes.length === 0) {
            const msg = this.searchQuery
                ? 'No notes match your search.'
                : 'No statistics for this time range.';
            this.tableContainer.createEl('p', { text: msg, cls: 'no-stats' });
            return;
        }

        const table = this.tableContainer.createEl('table', { cls: 'popular-table' });
        const thead = table.createEl('thead');
        const header = thead.createEl('tr');
        header.createEl('th', { text: 'Rank' });
        header.createEl('th', { text: 'Note' });
        header.createEl('th', { text: 'Time' });
        header.createEl('th', { text: 'Sessions' });
        header.createEl('th', { text: 'Last visited' });
        header.createEl('th', { text: 'Score' });

        const tbody = table.createEl('tbody');

        for (let i = 0; i < this.filteredNotes.length; i++) {
            const note = this.filteredNotes[i];
            const row = tbody.createEl('tr');
            this.rowEls.push(row);
            if (i === 0 && !this.searchQuery) row.addClass('top-note');
            if (i === this.selectedIndex) row.addClass('rts-row-selected');

            // Rank cell with badge — use original rank from full list
            const originalRank = this.notes.indexOf(note);
            const rankNum = (originalRank >= 0 ? originalRank : i) + 1;
            const rankCell = row.createEl('td');
            const rankBadge = rankCell.createEl('span', { cls: 'modal-rank-badge' });
            rankBadge.textContent = `#${rankNum}`;
            if (rankNum <= 3) rankBadge.addClass(`rank-${rankNum}`);

            // Note name
            const noteCell = row.createEl('td');
            const link = noteCell.createEl('a', { text: note.name });
            const open = () => {
                if (this.plugin.openNoteIfExists(note.path)) {
                    this.close();
                } else {
                    this.updateNotes();
                }
            };
            link.addEventListener('click', open);
            link.addEventListener('dblclick', (e) => {
                e.preventDefault();
                open();
            });

            // Right-click context menu on the row
            row.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.plugin.showNoteContextMenu(e, note.path, () => this.updateNotes());
            });

            // Track hover to update selection for keyboard
            row.addEventListener('mouseenter', () => {
                this.selectedIndex = i;
                this.refreshSelection();
            });

            // Stats
            row.createEl('td').createEl('span', {
                text: formatReadingTime(note.stats.totalReadingTime),
                cls: 'modal-stat',
            });
            row.createEl('td').createEl('span', {
                text: `${note.stats.readingCount}`,
                cls: 'modal-stat',
            });
            row.createEl('td', { text: formatLastVisited(note.stats.lastReadAt) });
            row.createEl('td').createEl('span', {
                text: `${Math.round(note.score)}`,
                cls: 'modal-score',
            });
        }
    }

    onClose(): void {
        const { contentEl } = this;
        if (this.boundKeyHandler) {
            contentEl.removeEventListener('keydown', this.boundKeyHandler);
            this.boundKeyHandler = null;
        }
        contentEl.empty();
    }
}

/**
 * Confirmation Modal
 */
class ConfirmModal extends Modal {
    private title: string;
    private message: string;
    private onConfirm: () => Promise<void>;

    constructor(app: App, title: string, message: string, onConfirm: () => Promise<void>) {
        super(app);
        this.title = title;
        this.message = message;
        this.onConfirm = onConfirm;
    }

    onOpen(): void {
        const { contentEl } = this;

        contentEl.createEl('h2', { text: this.title });
        contentEl.createEl('p', { text: this.message });

        const buttons = contentEl.createDiv({ cls: 'modal-buttons' });

        buttons
            .createEl('button', { text: 'Cancel' })
            .addEventListener('click', () => this.close());

        buttons
            .createEl('button', { text: 'Confirm', cls: 'mod-warning' })
            .addEventListener('click', () => {
                void this.onConfirm();
                this.close();
            });
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Settings Tab
 */
class ReadingTimeStatSettingTab extends PluginSettingTab {
    private plugin: ReadingTimeStatPlugin;

    constructor(app: App, plugin: ReadingTimeStatPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl).setName('Configuration').setHeading();

        new Setting(containerEl)
            .setName('Reading time weight')
            .setDesc('Weight for reading time in popularity calculation (per minute)')
            .addSlider((slider) =>
                slider
                    .setLimits(0.1, 5, 0.1)
                    .setValue(this.plugin.getSettings().readingTimeWeight)
                    .setDynamicTooltip()
                    .onChange((value) => {
                        this.plugin.getSettings().readingTimeWeight = value;
                        void this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Reading count weight')
            .setDesc('Weight for reading count in popularity calculation')
            .addSlider((slider) =>
                slider
                    .setLimits(1, 20, 1)
                    .setValue(this.plugin.getSettings().readingCountWeight)
                    .setDynamicTooltip()
                    .onChange((value) => {
                        this.plugin.getSettings().readingCountWeight = value;
                        void this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Recency decay factor')
            .setDesc('How much popularity decays per day since last read')
            .addSlider((slider) =>
                slider
                    .setLimits(0, 0.5, 0.01)
                    .setValue(this.plugin.getSettings().recencyDecayFactor)
                    .setDynamicTooltip()
                    .onChange((value) => {
                        this.plugin.getSettings().recencyDecayFactor = value;
                        void this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Popular notes limit')
            .setDesc('Maximum number of popular notes to display')
            .addText((text) =>
                text
                    .setValue(String(this.plugin.getSettings().popularNotesLimit))
                    .onChange((value) => {
                        const num = parseInt(value);
                        if (num > 0) {
                            this.plugin.getSettings().popularNotesLimit = num;
                            void this.plugin.saveSettings();
                            this.plugin.getView()?.update();
                        }
                    })
            );

        new Setting(containerEl)
            .setName('Minimum session time')
            .setDesc('Minimum seconds to count as a reading session')
            .addText((text) =>
                text
                    .setValue(String(this.plugin.getSettings().minSessionTime))
                    .onChange((value) => {
                        const num = parseInt(value);
                        if (num >= 0) {
                            this.plugin.getSettings().minSessionTime = num;
                            void this.plugin.saveSettings();
                        }
                    })
            );

        new Setting(containerEl)
            .setName('Show status bar')
            .setDesc('Display the current session time in the status bar. Click it to open the stats sidebar.')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.getSettings().showStatusBar)
                    .onChange((value) => {
                        this.plugin.getSettings().showStatusBar = value;
                        void this.plugin.saveSettings();
                        this.plugin.setupStatusBar();
                    })
            );

        // Exclusions section
        new Setting(containerEl).setName('Exclusions').setHeading();
        containerEl.createEl('p', {
            text: 'Exclude certain folders or files from tracking (e.g., kanban boards, templates, todo lists)',
            cls: 'settings-section-desc',
        });

        // Excluded folders
        new Setting(containerEl)
            .setName('Excluded folders')
            .setDesc('Folder paths to exclude, one per line. Example: kanban/, templates/')
            .addTextArea((text) =>
                text
                    .setPlaceholder('kanban/\ntemplates/\narchive/')
                    .setValue(this.plugin.getSettings().excludedFolders.join('\n'))
                    .onChange((value) => {
                        this.plugin.getSettings().excludedFolders = value
                            .split('\n')
                            .map((s) => s.trim())
                            .filter((s) => s.length > 0);
                        void this.plugin.saveSettings();
                    })
            );

        // Excluded patterns
        new Setting(containerEl)
            .setName('Excluded file patterns')
            .setDesc('File name patterns to exclude, supports * wildcard. One per line. Example: todo-*, *-kanban')
            .addTextArea((text) =>
                text
                    .setPlaceholder('todo-*\n*-kanban\ndaily note*')
                    .setValue(this.plugin.getSettings().excludedPatterns.join('\n'))
                    .onChange((value) => {
                        this.plugin.getSettings().excludedPatterns = value
                            .split('\n')
                            .map((s) => s.trim())
                            .filter((s) => s.length > 0);
                        void this.plugin.saveSettings();
                    })
            );
    }
}