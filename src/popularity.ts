import type { ReadingTimeStatSettings, PopularNote, NoteStats, TimeRange } from './types';
import { filterExcludedNotes } from './exclusions';

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.floor(diffTime / msPerDay);
}

/**
 * Get the start date for a given time range
 */
export function getTimeRangeStart(range: TimeRange): Date {
    const now = new Date();

    switch (range) {
        case 'today':
            return new Date(now.getFullYear(), now.getMonth(), now.getDate());
        case 'week':
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case 'month':
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case 'quarter':
            return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        case 'year':
            return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        case 'all':
            return new Date(0); // Beginning of time
        default:
            return new Date(0);
    }
}

/**
 * Check if a note was read within the time range
 */
function isWithinTimeRange(stats: NoteStats, rangeStart: Date): boolean {
    const lastRead = new Date(stats.lastReadAt);
    return lastRead >= rangeStart;
}

/**
 * Calculate popularity score for a note
 *
 * Formula: readingTime * timeWeight + readingCount * countWeight - daysSinceLastRead * decayFactor
 *
 * Higher score = more popular
 */
export function calculatePopularity(
    stats: NoteStats,
    settings: ReadingTimeStatSettings
): number {
    const now = new Date();
    const lastRead = new Date(stats.lastReadAt);
    const daysSinceLastRead = daysBetween(now, lastRead);

    const score =
        (stats.totalReadingTime / 60) * settings.readingTimeWeight +
        stats.readingCount * settings.readingCountWeight -
        daysSinceLastRead * settings.recencyDecayFactor;

    return Math.max(0, score);
}

/**
 * Calculate popularity for all notes and return sorted list
 * Optionally filter by time range
 */
export function getPopularNotes(
    notes: Record<string, NoteStats>,
    settings: ReadingTimeStatSettings,
    limit: number = settings.popularNotesLimit,
    timeRange: TimeRange = 'all'
): PopularNote[] {
    const now = new Date();
    const rangeStart = getTimeRangeStart(timeRange);

    // First filter out excluded notes
    const filteredNotes = filterExcludedNotes(notes, settings);

    const popularNotes: PopularNote[] = Object.entries(filteredNotes)
        .filter(([_, stats]) => isWithinTimeRange(stats, rangeStart))
        .map(([path, stats]) => {
            const lastRead = new Date(stats.lastReadAt);
            const daysSinceLastRead = daysBetween(now, lastRead);
            const name = path.split('/').pop()?.replace(/\.md$/, '') || path;

            return {
                path,
                name,
                score: calculatePopularity(stats, settings),
                stats,
                daysSinceLastRead,
            };
        });

    // Sort by score descending, take top N
    return popularNotes
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

/**
 * Format seconds to human readable string
 */
export function formatReadingTime(seconds: number): string {
    if (seconds < 60) {
        return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
        return remainingSeconds > 0
            ? `${minutes}m ${remainingSeconds}s`
            : `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
        ? `${hours}h ${remainingMinutes}m`
        : `${hours}h`;
}

/**
 * Format last visited date to human readable string
 * Shows relative time (e.g., "2 days ago") or absolute date for older entries
 */
export function formatLastVisited(lastReadAt: string): string {
    const lastRead = new Date(lastReadAt);
    const now = new Date();
    const diffMs = now.getTime() - lastRead.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) {
        return 'Just now';
    }
    if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
    }
    if (diffHours < 24) {
        return `${diffHours}h ago`;
    }
    if (diffDays === 1) {
        return 'Yesterday';
    }
    if (diffDays < 7) {
        return `${diffDays} days ago`;
    }
    // For older entries, show absolute date
    return lastRead.toLocaleDateString();
}