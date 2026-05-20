import type { StatsData, NoteStats, ReadingTimeStatSettings, DailyActivity } from './types';
import { DEFAULT_STATS_DATA } from './types';

/**
 * Manages reading statistics data
 */
export class StatsManager {
    private data: StatsData;
    private settings: ReadingTimeStatSettings;

    constructor(data: StatsData | null, settings: ReadingTimeStatSettings) {
        this.data = data ?? { ...DEFAULT_STATS_DATA };
        this.settings = settings;
        this.migrateData();
    }

    /**
     * Migrate older data versions to current schema.
     */
    private migrateData(): void {
        if (!this.data.dailyActivity) {
            this.data.dailyActivity = {};
        }
        if (this.data.version < 2) {
            // v1 had no dailyActivity; nothing to backfill without timestamps.
            this.data.version = 2;
        }
    }

    /**
     * Get current stats data
     */
    getData(): StatsData {
        return this.data;
    }

    /**
     * Record a reading session for a note
     */
    recordReading(path: string, durationSeconds: number, wasEdited: boolean = false): void {
        if (durationSeconds < this.settings.minSessionTime) {
            return;
        }

        const now = new Date();
        const existing = this.data.notes[path];

        if (existing) {
            existing.totalReadingTime += durationSeconds;
            existing.readingCount += 1;
            existing.lastReadAt = now.toISOString();
            if (wasEdited) {
                existing.hasEdited = true;
            }
        } else {
            const iso = now.toISOString();
            this.data.notes[path] = {
                totalReadingTime: durationSeconds,
                readingCount: 1,
                firstReadAt: iso,
                lastReadAt: iso,
                hasEdited: wasEdited,
            };
        }

        // Record daily activity (local date)
        this.recordDailyActivity(now, durationSeconds);
    }

    /**
     * Record daily activity for heatmap and analytics.
     * Uses local date strings (YYYY-MM-DD) and hour buckets (0-23).
     */
    private recordDailyActivity(date: Date, seconds: number): void {
        const localDate = this.formatLocalDate(date);
        const hour = date.getHours().toString();

        const activity = this.data.dailyActivity[localDate] ?? {
            totalSeconds: 0,
            sessions: 0,
            byHour: {},
        };
        activity.totalSeconds += seconds;
        activity.sessions += 1;
        activity.byHour[hour] = (activity.byHour[hour] ?? 0) + seconds;
        this.data.dailyActivity[localDate] = activity;
    }

    /**
     * Format a Date as YYYY-MM-DD in local time.
     */
    private formatLocalDate(date: Date): string {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    /**
     * Get stats for a specific note
     */
    getNoteStats(path: string): NoteStats | undefined {
        return this.data.notes[path];
    }

    /**
     * Get all notes with stats
     */
    getAllNotes(): Record<string, NoteStats> {
        return this.data.notes;
    }

    /**
     * Delete stats for a note (when note is deleted)
     */
    deleteNote(path: string): boolean {
        if (this.data.notes[path]) {
            delete this.data.notes[path];
            return true;
        }
        return false;
    }

    /**
     * Migrate stats from one path to another (when note is renamed/moved)
     * If the new path already has stats, the old data is discarded to avoid
     * conflicts.
     */
    migrateNote(oldPath: string, newPath: string): boolean {
        if (oldPath === newPath) {
            return false;
        }
        const stats = this.data.notes[oldPath];
        if (!stats) {
            return false;
        }
        if (!this.data.notes[newPath]) {
            this.data.notes[newPath] = stats;
        }
        delete this.data.notes[oldPath];
        return true;
    }

    /**
     * Remove stats entries whose paths are not in the provided set of
     * existing paths. Returns the number of entries removed.
     */
    removeOrphans(existingPaths: Set<string>): number {
        let removed = 0;
        for (const path of Object.keys(this.data.notes)) {
            if (!existingPaths.has(path)) {
                delete this.data.notes[path];
                removed++;
            }
        }
        return removed;
    }

    /**
     * Clear all statistics
     */
    clearAll(): void {
        this.data = {
            ...DEFAULT_STATS_DATA,
            trackingStartedAt: new Date().toISOString(),
        };
    }

    /**
     * Get total statistics summary
     */
    getSummary(): {
        totalNotes: number;
        totalTimeSeconds: number;
        totalSessions: number;
        trackingStartedAt: string;
    } {
        let totalTime = 0;
        let totalSessions = 0;

        for (const stats of Object.values(this.data.notes)) {
            totalTime += stats.totalReadingTime;
            totalSessions += stats.readingCount;
        }

        return {
            totalNotes: Object.keys(this.data.notes).length,
            totalTimeSeconds: totalTime,
            totalSessions,
            trackingStartedAt: this.data.trackingStartedAt,
        };
    }

    /**
     * Get daily activity data for a range of dates.
     * Returns a map from 'YYYY-MM-DD' to DailyActivity.
     */
    getDailyActivity(fromDate: Date, toDate: Date): Record<string, DailyActivity> {
        const result: Record<string, DailyActivity> = {};
        const current = new Date(fromDate);
        current.setHours(0, 0, 0, 0);
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);

        while (current <= end) {
            const key = this.formatLocalDate(current);
            if (this.data.dailyActivity[key]) {
                result[key] = this.data.dailyActivity[key];
            }
            current.setDate(current.getDate() + 1);
        }
        return result;
    }

    /**
     * Get all daily activity data.
     */
    getAllDailyActivity(): Record<string, DailyActivity> {
        return this.data.dailyActivity;
    }

    /**
     * Compute streak: consecutive days with reading activity up to today.
     */
    getStreak(): { current: number; longest: number } {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dates = Object.keys(this.data.dailyActivity).sort().reverse();

        let current = 0;
        const oneDayMs = 24 * 60 * 60 * 1000;

        // Count current streak backwards from today
        let checkDate = new Date(today);
        while (true) {
            const key = this.formatLocalDate(checkDate);
            if (this.data.dailyActivity[key]) {
                current++;
                checkDate = new Date(checkDate.getTime() - oneDayMs);
            } else {
                break;
            }
        }

        // Compute longest streak
        let longest = 0;
        let temp = 0;
        const sorted = Object.keys(this.data.dailyActivity).sort();
        let prev: Date | null = null;
        for (const d of sorted) {
            const cur = new Date(d + 'T00:00:00');
            if (prev === null || cur.getTime() - prev.getTime() > oneDayMs * 1.5) {
                temp = 1;
            } else {
                temp++;
            }
            longest = Math.max(longest, temp);
            prev = cur;
        }

        return { current, longest };
    }

    /**
     * Find most productive hour (by total seconds) across all time.
     */
    getMostProductiveHour(): { hour: number; seconds: number } | null {
        const hourTotals: Record<number, number> = {};
        for (const activity of Object.values(this.data.dailyActivity)) {
            for (const [h, s] of Object.entries(activity.byHour)) {
                const hour = parseInt(h, 10);
                hourTotals[hour] = (hourTotals[hour] ?? 0) + s;
            }
        }
        let best: { hour: number; seconds: number } | null = null;
        for (const [h, s] of Object.entries(hourTotals)) {
            const hour = parseInt(h, 10);
            if (!best || s > best.seconds) {
                best = { hour, seconds: s };
            }
        }
        return best;
    }

    /**
     * Get summary for a date range (week, month, etc.)
     */
    getRangeSummary(fromDate: Date, toDate: Date): {
        totalSeconds: number;
        sessions: number;
        daysActive: number;
        avgSecondsPerDay: number;
    } {
        let totalSeconds = 0;
        let sessions = 0;
        let daysActive = 0;

        const activity = this.getDailyActivity(fromDate, toDate);
        for (const a of Object.values(activity)) {
            totalSeconds += a.totalSeconds;
            sessions += a.sessions;
            daysActive++;
        }

        const days = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1);

        return {
            totalSeconds,
            sessions,
            daysActive,
            avgSecondsPerDay: Math.round(totalSeconds / days),
        };
    }
}