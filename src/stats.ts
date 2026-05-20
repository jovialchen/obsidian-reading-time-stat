import type { StatsData, NoteStats, ReadingTimeStatSettings } from './types';
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

        const existing = this.data.notes[path];

        if (existing) {
            existing.totalReadingTime += durationSeconds;
            existing.readingCount += 1;
            existing.lastReadAt = new Date().toISOString();
            if (wasEdited) {
                existing.hasEdited = true;
            }
        } else {
            const now = new Date().toISOString();
            this.data.notes[path] = {
                totalReadingTime: durationSeconds,
                readingCount: 1,
                firstReadAt: now,
                lastReadAt: now,
                hasEdited: wasEdited,
            };
        }
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
}