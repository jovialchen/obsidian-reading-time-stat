import { App, TFile, EventRef } from 'obsidian';
import type { ReadingTimeStatSettings } from './types';
import { StatsManager } from './stats';
import { shouldExclude } from './exclusions';

/**
 * Current tracking status for display
 */
export interface TrackingStatus {
    /** Currently tracked file path */
    filePath: string | null;
    /** Current session duration in seconds */
    currentSessionTime: number;
    /** Total time for this note including current session */
    totalTime: number;
    /** Whether the note has been edited in this session */
    hasEdited: boolean;
}

/**
 * Tracks reading time for active notes
 */
export class ReadingTimeTracker {
    private app: App;
    private statsManager: StatsManager;
    private settings: ReadingTimeStatSettings;

    private currentFile: TFile | null = null;
    private sessionStartTime: number | null = null;
    private accumulatedTime: number = 0;
    private hasEdited: boolean = false;
    private trackingIntervalId: number | null = null;
    private updateIntervalId: number | null = null;

    private onFileChange: EventRef | null = null;
    private onEditorChange: EventRef | null = null;

    private saveDataCallback: () => Promise<void>;
    private updateCallback: () => void;

    constructor(
        app: App,
        statsManager: StatsManager,
        settings: ReadingTimeStatSettings,
        saveDataCallback: () => Promise<void>,
        updateCallback: () => void = () => {}
    ) {
        this.app = app;
        this.statsManager = statsManager;
        this.settings = settings;
        this.saveDataCallback = saveDataCallback;
        this.updateCallback = updateCallback;
    }

    /**
     * Start tracking
     */
    start(): void {
        // Listen for active leaf changes
        this.onFileChange = this.app.workspace.on('active-leaf-change', () => {
            this.handleFileChange();
        });

        // Listen for editor changes to detect edits
        this.onEditorChange = this.app.workspace.on('editor-change', () => {
            this.hasEdited = true;
        });

        // Start tracking current file if any
        this.handleFileChange();

        // Start periodic save
        this.startPeriodicSave();

        // Start periodic UI update
        this.startPeriodicUpdate();
    }

    /**
     * Stop tracking
     */
    stop(): void {
        this.saveCurrentSession();
        this.stopTracking();

        if (this.onFileChange) {
            this.app.workspace.offref(this.onFileChange);
        }
        if (this.onEditorChange) {
            this.app.workspace.offref(this.onEditorChange);
        }

        if (this.trackingIntervalId) {
            window.clearInterval(this.trackingIntervalId);
        }
        if (this.updateIntervalId) {
            window.clearInterval(this.updateIntervalId);
        }
    }

    /**
     * Update settings
     */
    updateSettings(settings: ReadingTimeStatSettings): void {
        this.settings = settings;
    }

    /**
     * Get current tracking status for display
     */
    getStatus(): TrackingStatus {
        const currentSessionTime = this.sessionStartTime !== null
            ? Math.floor((Date.now() - this.sessionStartTime) / 1000) + this.accumulatedTime
            : 0;

        const existingStats = this.currentFile
            ? this.statsManager.getNoteStats(this.currentFile.path)
            : null;

        const totalTime = existingStats
            ? existingStats.totalReadingTime + currentSessionTime
            : currentSessionTime;

        return {
            filePath: this.currentFile?.path ?? null,
            currentSessionTime,
            totalTime,
            hasEdited: this.hasEdited,
        };
    }

    /**
     * Handle file change event
     */
    private handleFileChange(): void {
        const activeFile = this.app.workspace.getActiveFile();

        // Same file, no need to change
        if (activeFile?.path === this.currentFile?.path) {
            return;
        }

        // Save current session before switching
        this.saveCurrentSession();

        // Notify UI of file change
        this.updateCallback();

        // Start new session if file is markdown and not excluded
        if (activeFile && activeFile.extension === 'md') {
            if (shouldExclude(activeFile.path, this.settings)) {
                this.stopTracking();
            } else {
                this.startTracking(activeFile);
            }
        } else {
            this.stopTracking();
        }
    }

    /**
     * Start tracking a file
     */
    private startTracking(file: TFile): void {
        this.currentFile = file;
        this.sessionStartTime = Date.now();
        this.accumulatedTime = 0;
        this.hasEdited = false;
    }

    /**
     * Stop tracking
     */
    private stopTracking(): void {
        this.currentFile = null;
        this.sessionStartTime = null;
        this.accumulatedTime = 0;
        this.hasEdited = false;
    }

    /**
     * Save current reading session
     */
    private saveCurrentSession(): void {
        if (!this.currentFile || this.sessionStartTime === null) {
            return;
        }

        const duration = Math.floor((Date.now() - this.sessionStartTime) / 1000) + this.accumulatedTime;

        if (duration >= this.settings.minSessionTime) {
            this.statsManager.recordReading(
                this.currentFile.path,
                duration,
                this.hasEdited
            );
        }

        // Reset for next session
        this.sessionStartTime = Date.now();
        this.accumulatedTime = 0;
        this.hasEdited = false;
    }

    /**
     * Start periodic save to persist data
     */
    private startPeriodicSave(): void {
        // Save every 30 seconds
        this.trackingIntervalId = window.setInterval(() => {
            this.saveCurrentSession();
            void this.saveDataCallback();
        }, 30000);
    }

    /**
     * Start periodic UI update
     */
    private startPeriodicUpdate(): void {
        // Update UI every 2 seconds
        this.updateIntervalId = window.setInterval(() => {
            this.updateCallback();
        }, 2000);
    }
}