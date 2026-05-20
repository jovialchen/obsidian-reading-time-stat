import { App, Modal, Setting, Notice, TFile } from 'obsidian';
import type { StatsManager } from './stats';
import type { DailyActivity, ReadingTimeStatSettings } from './types';
import { formatReadingTime } from './popularity';

/**
 * Heatmap colors for different activity levels.
 */
const HEAT_LEVELS = [
    'var(--background-secondary-alt)',
    'rgba(46, 204, 113, 0.2)',
    'rgba(46, 204, 113, 0.35)',
    'rgba(46, 204, 113, 0.5)',
    'rgba(46, 204, 113, 0.7)',
];

/**
 * Format hour number to 12h string for display.
 */
function formatHour12(hour: number): string {
    if (hour === 0) return '12a';
    if (hour < 12) return `${hour}a`;
    if (hour === 12) return '12p';
    return `${hour - 12}p`;
}

/**
 * Get color for activity level.
 */
function getHeatColor(seconds: number, maxSeconds: number): string {
    if (seconds === 0 || maxSeconds === 0) return HEAT_LEVELS[0];
    const ratio = seconds / maxSeconds;
    const level = Math.min(HEAT_LEVELS.length - 1, Math.floor(ratio * HEAT_LEVELS.length));
    return HEAT_LEVELS[level];
}

/**
 * Modal showing reading heatmap and analytics.
 */
export class AnalyticsModal extends Modal {
    private statsManager: StatsManager;
    private settings: ReadingTimeStatSettings;

    constructor(app: App, statsManager: StatsManager, settings: ReadingTimeStatSettings) {
        super(app);
        this.statsManager = statsManager;
        this.settings = settings;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.addClass('rts-analytics-modal');

        contentEl.createEl('h2', { text: 'Reading Analytics' });

        // Streak and productive hour
        const streak = this.statsManager.getStreak();
        const productiveHour = this.statsManager.getMostProductiveHour();

        const insights = contentEl.createDiv({ cls: 'rts-insights' });
        const grid = insights.createDiv({ cls: 'rts-insights-grid' });

        const streakBox = grid.createDiv({ cls: 'rts-insight-box' });
        streakBox.createEl('div', { text: '🔥', cls: 'rts-insight-icon' });
        streakBox.createEl('div', { text: `${streak.current}`, cls: 'rts-insight-value' });
        streakBox.createEl('div', { text: 'day streak', cls: 'rts-insight-label' });

        const longestBox = grid.createDiv({ cls: 'rts-insight-box' });
        longestBox.createEl('div', { text: '🏆', cls: 'rts-insight-icon' });
        longestBox.createEl('div', { text: `${streak.longest}`, cls: 'rts-insight-value' });
        longestBox.createEl('div', { text: 'longest streak', cls: 'rts-insight-label' });

        if (productiveHour) {
            const hourBox = grid.createDiv({ cls: 'rts-insight-box' });
            hourBox.createEl('div', { text: '⏰', cls: 'rts-insight-icon' });
            hourBox.createEl('div', { text: formatHour12(productiveHour.hour), cls: 'rts-insight-value' });
            hourBox.createEl('div', { text: 'peak reading time', cls: 'rts-insight-label' });
        }

        // Weekly/Monthly summary
        const now = new Date();
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const weekSum = this.statsManager.getRangeSummary(weekStart, now);
        const monthSum = this.statsManager.getRangeSummary(monthStart, now);

        const summary = contentEl.createDiv({ cls: 'rts-summary-grid' });
        const weekBox = summary.createDiv({ cls: 'rts-summary-box' });
        weekBox.createEl('h3', { text: 'Last 7 Days' });
        weekBox.createEl('p', { text: `Time: ${formatReadingTime(weekSum.totalSeconds)}` });
        weekBox.createEl('p', { text: `Sessions: ${weekSum.sessions}` });
        weekBox.createEl('p', { text: `Active days: ${weekSum.daysActive}` });

        const monthBox = summary.createDiv({ cls: 'rts-summary-box' });
        monthBox.createEl('h3', { text: 'Last 30 Days' });
        monthBox.createEl('p', { text: `Time: ${formatReadingTime(monthSum.totalSeconds)}` });
        monthBox.createEl('p', { text: `Sessions: ${monthSum.sessions}` });
        monthBox.createEl('p', { text: `Active days: ${monthSum.daysActive}` });
        monthBox.createEl('p', { text: `Avg/day: ${formatReadingTime(monthSum.avgSecondsPerDay)}` });

        // Heatmap
        contentEl.createEl('h3', { text: 'Reading Heatmap (Last 90 Days)', cls: 'rts-heatmap-title' });
        this.renderHeatmap(contentEl, 90);

        // Hourly activity
        contentEl.createEl('h3', { text: 'Hourly Activity', cls: 'rts-heatmap-title' });
        this.renderHourlyChart(contentEl);

        // Export buttons
        const exportDiv = contentEl.createDiv({ cls: 'rts-export-section' });
        exportDiv.createEl('h3', { text: 'Export Data' });

        new Setting(exportDiv)
            .setName('Export as CSV')
            .setDesc('Download daily activity as CSV for spreadsheet analysis')
            .addButton((btn) =>
                btn.setButtonText('Export CSV').onClick(() => {
                    void this.exportCSV();
                })
            );

        new Setting(exportDiv)
            .setName('Export as Markdown')
            .setDesc('Generate a Markdown report in your vault')
            .addButton((btn) =>
                btn.setButtonText('Export Markdown').onClick(() => {
                    void this.exportMarkdown();
                })
            );
    }

    private renderHeatmap(container: HTMLElement, days: number): void {
        const now = new Date();
        const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const activity = this.statsManager.getDailyActivity(startDate, now);

        // Find max for scaling
        let maxSeconds = 0;
        for (const a of Object.values(activity)) {
            if (a.totalSeconds > maxSeconds) maxSeconds = a.totalSeconds;
        }

        const heatmap = container.createDiv({ cls: 'rts-heatmap' });

        // Day labels
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const labelCol = heatmap.createDiv({ cls: 'rts-heatmap-labels' });
        for (const d of dayLabels) {
            labelCol.createEl('div', { text: d, cls: 'rts-heatmap-label' });
        }

        // Grid
        const grid = heatmap.createDiv({ cls: 'rts-heatmap-grid' });

        // Calculate start day of week for alignment
        const startDay = startDate.getDay();
        for (let i = 0; i < startDay; i++) {
            grid.createDiv({ cls: 'rts-heatmap-cell empty' });
        }

        const current = new Date(startDate);
        while (current <= now) {
            const key = this.formatLocalDate(current);
            const a = activity[key];
            const cell = grid.createDiv({ cls: 'rts-heatmap-cell' });
            const seconds = a?.totalSeconds ?? 0;
            cell.style.backgroundColor = getHeatColor(seconds, maxSeconds);
            cell.setAttr('aria-label', `${key}: ${formatReadingTime(seconds)}`);
            cell.setAttr('data-date', key);
            current.setDate(current.getDate() + 1);
        }

        // Legend
        const legend = container.createDiv({ cls: 'rts-heatmap-legend' });
        legend.createEl('span', { text: 'Less', cls: 'rts-legend-label' });
        for (const color of HEAT_LEVELS) {
            const box = legend.createDiv({ cls: 'rts-legend-box' });
            box.style.backgroundColor = color;
        }
        legend.createEl('span', { text: 'More', cls: 'rts-legend-label' });
    }

    private renderHourlyChart(container: HTMLElement): void {
        const activity = this.statsManager.getAllDailyActivity();
        const hourTotals: number[] = new Array(24).fill(0);

        for (const a of Object.values(activity)) {
            for (const [h, s] of Object.entries(a.byHour)) {
                const hour = parseInt(h, 10);
                if (hour >= 0 && hour < 24) {
                    hourTotals[hour] += s;
                }
            }
        }

        const maxHour = Math.max(...hourTotals, 1);

        const chart = container.createDiv({ cls: 'rts-hourly-chart' });
        const bars = chart.createDiv({ cls: 'rts-hourly-bars' });

        for (let h = 0; h < 24; h++) {
            const col = bars.createDiv({ cls: 'rts-hourly-col' });
            const bar = col.createDiv({ cls: 'rts-hourly-bar' });
            const pct = (hourTotals[h] / maxHour) * 100;
            bar.style.height = `${Math.max(2, pct)}%`;
            bar.setAttr('aria-label', `${formatHour12(h)}: ${formatReadingTime(hourTotals[h])}`);
        }

        // X-axis labels (every 3 hours)
        const labels = chart.createDiv({ cls: 'rts-hourly-labels' });
        for (let h = 0; h < 24; h += 3) {
            labels.createEl('span', { text: formatHour12(h), cls: 'rts-hour-label' });
        }
    }

    private async exportCSV(): Promise<void> {
        const activity = this.statsManager.getAllDailyActivity();
        const rows = ['Date,TotalSeconds,Sessions'];
        const sorted = Object.keys(activity).sort();
        for (const date of sorted) {
            const a = activity[date];
            rows.push(`${date},${a.totalSeconds},${a.sessions}`);
        }

        const content = rows.join('\n');
        const fileName = `reading-activity-${this.formatLocalDate(new Date())}.csv`;

        // Save to vault root
        const file = this.app.vault.getAbstractFileByPath(fileName);
        if (file) {
            await this.app.vault.modify(file as TFile, content);
        } else {
            await this.app.vault.create(fileName, content);
        }
        new Notice(`Exported to ${fileName}`);
    }

    private async exportMarkdown(): Promise<void> {
        const now = new Date();
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const weekSum = this.statsManager.getRangeSummary(weekStart, now);
        const monthSum = this.statsManager.getRangeSummary(monthStart, now);
        const streak = this.statsManager.getStreak();
        const productiveHour = this.statsManager.getMostProductiveHour();

        const lines: string[] = [];
        lines.push('# Reading Statistics Report');
        lines.push(`Generated: ${now.toLocaleString()}`);
        lines.push('');
        lines.push('## Streaks');
        lines.push(`- Current streak: **${streak.current}** days`);
        lines.push(`- Longest streak: **${streak.longest}** days`);
        if (productiveHour) {
            lines.push(`- Peak reading time: **${formatHour12(productiveHour.hour)}**`);
        }
        lines.push('');
        lines.push('## Last 7 Days');
        lines.push(`- Total time: ${formatReadingTime(weekSum.totalSeconds)}`);
        lines.push(`- Sessions: ${weekSum.sessions}`);
        lines.push(`- Active days: ${weekSum.daysActive}`);
        lines.push('');
        lines.push('## Last 30 Days');
        lines.push(`- Total time: ${formatReadingTime(monthSum.totalSeconds)}`);
        lines.push(`- Sessions: ${monthSum.sessions}`);
        lines.push(`- Active days: ${monthSum.daysActive}`);
        lines.push(`- Average per day: ${formatReadingTime(monthSum.avgSecondsPerDay)}`);

        const content = lines.join('\n');
        const fileName = `reading-report-${this.formatLocalDate(now)}.md`;

        const file = this.app.vault.getAbstractFileByPath(fileName);
        if (file) {
            await this.app.vault.modify(file as TFile, content);
        } else {
            await this.app.vault.create(fileName, content);
        }
        new Notice(`Exported to ${fileName}`);
    }

    private formatLocalDate(date: Date): string {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}
