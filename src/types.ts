/**
 * Reading statistics for a single note
 */
export interface NoteStats {
    /** Total reading time in seconds */
    totalReadingTime: number;
    /** Number of reading sessions */
    readingCount: number;
    /** ISO timestamp of last read */
    lastReadAt: string;
    /** ISO timestamp of first read */
    firstReadAt: string;
    /** Whether the note has been edited during reading sessions */
    hasEdited: boolean;
}

/**
 * All statistics data persisted by the plugin
 */
export interface StatsData {
    /** Map of file path to its statistics */
    notes: Record<string, NoteStats>;
    /** ISO timestamp of when tracking started */
    trackingStartedAt: string;
    /** Plugin version for migration purposes */
    version: number;
}

/**
 * Note with calculated popularity score
 */
export interface PopularNote {
    /** File path */
    path: string;
    /** Display name (file name without extension) */
    name: string;
    /** Calculated popularity score */
    score: number;
    /** Raw stats for display */
    stats: NoteStats;
    /** Days since last read */
    daysSinceLastRead: number;
}

/**
 * Time range options for filtering popular notes
 */
export type TimeRange = 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year';

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' },
    { value: 'quarter', label: 'Last 90 Days' },
    { value: 'year', label: 'Last Year' },
];

/**
 * Plugin settings
 */
export interface ReadingTimeStatSettings {
    /** Weight for reading time in popularity calculation */
    readingTimeWeight: number;
    /** Weight for reading count in popularity calculation */
    readingCountWeight: number;
    /** Decay factor per day since last read */
    recencyDecayFactor: number;
    /** Minimum reading time (seconds) to count as a session */
    minSessionTime: number;
    /** Interval for tracking (milliseconds) */
    trackingInterval: number;
    /** Number of popular notes to show */
    popularNotesLimit: number;
    /** Folder paths to exclude from tracking (e.g., "Kanban/", "Templates/") */
    excludedFolders: string[];
    /** File name patterns to exclude (supports wildcards, e.g., "todo-*", "*-kanban") */
    excludedPatterns: string[];
}

export const DEFAULT_SETTINGS: ReadingTimeStatSettings = {
    readingTimeWeight: 1.0,
    readingCountWeight: 5.0,
    recencyDecayFactor: 0.05,
    minSessionTime: 5,
    trackingInterval: 1000,
    popularNotesLimit: 20,
    excludedFolders: [],
    excludedPatterns: [],
};

export const DEFAULT_STATS_DATA: StatsData = {
    notes: {},
    trackingStartedAt: new Date().toISOString(),
    version: 1,
};