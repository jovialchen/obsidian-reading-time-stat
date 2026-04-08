import {
    App,
    ItemView,
    Modal,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting,
    WorkspaceLeaf,
} from 'obsidian';
import type { ReadingTimeStatSettings, StatsData, PopularNote, TimeRange } from './types';
import { DEFAULT_SETTINGS, TIME_RANGE_OPTIONS } from './types';
import { StatsManager } from './stats';
import { ReadingTimeTracker, TrackingStatus } from './tracker';
import { getPopularNotes, formatReadingTime, formatLastVisited } from './popularity';

const VIEW_TYPE = 'reading-time-stat-view';

/**
 * Reading Time Statistics Plugin
 */
export default class ReadingTimeStatPlugin extends Plugin {
    private settings: ReadingTimeStatSettings;
    private statsManager: StatsManager;
    private tracker: ReadingTimeTracker;
    private view: ReadingTimeStatView | null = null;

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
                if (this.view) {
                    this.view.update();
                }
            }
        );

        // Register view
        this.registerView(VIEW_TYPE, (leaf) => {
            this.view = new ReadingTimeStatView(leaf, this);
            return this.view;
        });

        // Add ribbon icon
        this.addRibbonIcon('clock', 'Reading Time Stats', () => {
            this.activateView();
        });

        // Add commands
        this.addCommand({
            id: 'open-stats-view',
            name: 'Open Statistics View',
            callback: () => this.activateView(),
        });

        this.addCommand({
            id: 'show-popular-notes',
            name: 'Show Popular Notes',
            callback: () => this.showPopularNotesModal(),
        });

        this.addCommand({
            id: 'export-stats',
            name: 'Export Statistics',
            callback: () => this.exportStats(),
        });

        this.addCommand({
            id: 'clear-stats',
            name: 'Clear All Statistics',
            callback: () => this.confirmClearStats(),
        });

        // Add settings tab
        this.addSettingTab(new ReadingTimeStatSettingTab(this.app, this));

        // Start tracking
        this.tracker.start();

        // Register for cleanup on plugin unload
        this.register(() => this.tracker.stop());
    }

    async onunload() {
        this.tracker.stop();
        await this.saveStats();

        if (this.view) {
            this.view.destroy();
        }
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
            workspace.revealLeaf(leaf);
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

        new PopularNotesModal(this.app, popularNotes, this.settings, this.statsManager, timeRange).open();
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
            'Clear All Statistics',
            'This will permanently delete all reading time statistics. Are you sure?',
            async () => {
                this.statsManager.clearAll();
                await this.saveStats();
                if (this.view) {
                    this.view.update();
                }
                new Notice('All statistics cleared');
            }
        ).open();
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

    getViewType(): string {
        return VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'Reading Time Stats';
    }

    getIcon(): string {
        return 'clock';
    }

    async onOpen(): Promise<void> {
        this.update();
    }

    async onClose(): Promise<void> {
        // Cleanup
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

        // Summary section
        const summary = this.plugin.getStatsManager().getSummary();
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

        // Time range selector
        const filterDiv = container.createDiv({ cls: 'time-range-filter' });
        filterDiv.createEl('span', { text: 'Time Range: ', cls: 'filter-label' });

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
        const popularNotes = getPopularNotes(
            this.plugin.getStatsManager().getAllNotes(),
            this.plugin.getSettings(),
            10,
            this.currentTimeRange
        );

        const popularDiv = container.createDiv({ cls: 'popular-notes' });
        const rangeLabel = TIME_RANGE_OPTIONS.find(o => o.value === this.currentTimeRange)?.label || 'All Time';
        popularDiv.createEl('h3', { text: `Popular Notes` });
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

                // Note name (clickable)
                item.createEl('a', {
                    text: note.name,
                    cls: 'note-name',
                }).addEventListener('click', () => {
                    this.app.workspace.openLinkText(note.path, '', true);
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
        trackingDiv.createEl('h3', { text: 'Currently Tracking' });

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
            trackingDiv.createEl('p', {
                text: 'No markdown file active or file is excluded',
                cls: 'no-tracking',
            });
        }
    }
}

/**
 * Popular Notes Modal
 */
class PopularNotesModal extends Modal {
    private notes: PopularNote[];
    private settings: ReadingTimeStatSettings;
    private statsManager: StatsManager;
    private currentTimeRange: TimeRange;
    private tableContainer: HTMLDivElement | null = null;

    constructor(
        app: App,
        notes: PopularNote[],
        settings: ReadingTimeStatSettings,
        statsManager: StatsManager,
        timeRange: TimeRange = 'all'
    ) {
        super(app);
        this.notes = notes;
        this.settings = settings;
        this.statsManager = statsManager;
        this.currentTimeRange = timeRange;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.addClass('popular-notes-modal');

        contentEl.createEl('h2', { text: 'Popular Notes Ranking' });

        // Time range selector
        const filterDiv = contentEl.createDiv({ cls: 'modal-filter' });
        filterDiv.createEl('span', { text: 'Time Range: ', cls: 'filter-label' });

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

        // Table container for dynamic updates
        this.tableContainer = contentEl.createDiv({ cls: 'table-container' });
        this.renderTable();
    }

    /**
     * Update notes when time range changes
     */
    private updateNotes(): void {
        this.notes = getPopularNotes(
            this.statsManager.getAllNotes(),
            this.settings,
            this.settings.popularNotesLimit,
            this.currentTimeRange
        );
        if (this.tableContainer) {
            this.tableContainer.empty();
            this.renderTable();
        }
    }

    /**
     * Render the notes table
     */
    private renderTable(): void {
        if (!this.tableContainer) return;

        if (this.notes.length === 0) {
            this.tableContainer.createEl('p', { text: 'No statistics for this time range.', cls: 'no-stats' });
            return;
        }

        const table = this.tableContainer.createEl('table', { cls: 'popular-table' });
        const thead = table.createEl('thead');
        const header = thead.createEl('tr');
        header.createEl('th', { text: 'Rank' });
        header.createEl('th', { text: 'Note' });
        header.createEl('th', { text: 'Time' });
        header.createEl('th', { text: 'Sessions' });
        header.createEl('th', { text: 'Last Visited' });
        header.createEl('th', { text: 'Score' });

        const tbody = table.createEl('tbody');

        for (let i = 0; i < this.notes.length; i++) {
            const note = this.notes[i];
            const row = tbody.createEl('tr');
            if (i === 0) row.addClass('top-note');

            // Rank cell with badge
            const rankCell = row.createEl('td');
            const rankBadge = rankCell.createEl('span', { cls: 'modal-rank-badge' });
            rankBadge.textContent = `#${i + 1}`;
            if (i < 3) rankBadge.addClass(`rank-${i + 1}`);

            // Note name
            const noteCell = row.createEl('td');
            noteCell.createEl('a', { text: note.name }).addEventListener('click', () => {
                this.app.workspace.openLinkText(note.path, '', true);
                this.close();
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
            .addEventListener('click', async () => {
                await this.onConfirm();
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

        containerEl.createEl('h2', { text: 'Reading Time Statistics Settings' });

        new Setting(containerEl)
            .setName('Reading Time Weight')
            .setDesc('Weight for reading time in popularity calculation (per minute)')
            .addSlider((slider) =>
                slider
                    .setLimits(0.1, 5, 0.1)
                    .setValue(this.plugin.getSettings().readingTimeWeight)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.getSettings().readingTimeWeight = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Reading Count Weight')
            .setDesc('Weight for reading count in popularity calculation')
            .addSlider((slider) =>
                slider
                    .setLimits(1, 20, 1)
                    .setValue(this.plugin.getSettings().readingCountWeight)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.getSettings().readingCountWeight = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Recency Decay Factor')
            .setDesc('How much popularity decays per day since last read')
            .addSlider((slider) =>
                slider
                    .setLimits(0, 0.5, 0.01)
                    .setValue(this.plugin.getSettings().recencyDecayFactor)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.getSettings().recencyDecayFactor = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Popular Notes Limit')
            .setDesc('Maximum number of popular notes to display')
            .addText((text) =>
                text
                    .setValue(String(this.plugin.getSettings().popularNotesLimit))
                    .onChange(async (value) => {
                        const num = parseInt(value);
                        if (num > 0) {
                            this.plugin.getSettings().popularNotesLimit = num;
                            await this.plugin.saveSettings();
                        }
                    })
            );

        new Setting(containerEl)
            .setName('Minimum Session Time')
            .setDesc('Minimum seconds to count as a reading session')
            .addText((text) =>
                text
                    .setValue(String(this.plugin.getSettings().minSessionTime))
                    .onChange(async (value) => {
                        const num = parseInt(value);
                        if (num >= 0) {
                            this.plugin.getSettings().minSessionTime = num;
                            await this.plugin.saveSettings();
                        }
                    })
            );

        // Exclusions section
        containerEl.createEl('h3', { text: 'Exclusions', cls: 'settings-section-header' });
        containerEl.createEl('p', {
            text: 'Exclude certain folders or files from tracking (e.g., Kanban boards, Templates, Todo lists)',
            cls: 'settings-section-desc',
        });

        // Excluded folders
        new Setting(containerEl)
            .setName('Excluded Folders')
            .setDesc('Folder paths to exclude. One per line. Example: Kanban/, Templates/')
            .addTextArea((text) =>
                text
                    .setPlaceholder('Kanban/\nTemplates/\nArchive/')
                    .setValue(this.plugin.getSettings().excludedFolders.join('\n'))
                    .onChange(async (value) => {
                        this.plugin.getSettings().excludedFolders = value
                            .split('\n')
                            .map((s) => s.trim())
                            .filter((s) => s.length > 0);
                        await this.plugin.saveSettings();
                    })
            );

        // Excluded patterns
        new Setting(containerEl)
            .setName('Excluded File Patterns')
            .setDesc('File name patterns to exclude. Supports * wildcard. One per line. Example: todo-*, *-kanban')
            .addTextArea((text) =>
                text
                    .setPlaceholder('todo-*\n*-kanban\nDaily Note*')
                    .setValue(this.plugin.getSettings().excludedPatterns.join('\n'))
                    .onChange(async (value) => {
                        this.plugin.getSettings().excludedPatterns = value
                            .split('\n')
                            .map((s) => s.trim())
                            .filter((s) => s.length > 0);
                        await this.plugin.saveSettings();
                    })
            );
    }
}