import type { ReadingTimeStatSettings } from './types';

/**
 * Check if a file path matches a wildcard pattern
 * Supports * for any characters and ? for single character
 */
function matchesPattern(filePath: string, pattern: string): boolean {
    // Convert wildcard pattern to regex
    const regexPattern = pattern
        .replace(/\*/g, '.*')  // * matches any characters
        .replace(/\?/g, '.')   // ? matches single character
        .replace(/\./g, '\\.'); // Escape literal dots

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(filePath);
}

/**
 * Check if a file path should be excluded from tracking
 */
export function shouldExclude(filePath: string, settings: ReadingTimeStatSettings): boolean {
    // Normalize path (remove leading slash if present)
    const normalizedPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;

    // Check excluded folders
    for (const folder of settings.excludedFolders) {
        const normalizedFolder = folder.startsWith('/') ? folder.slice(1) : folder;
        // Ensure folder ends with /
        const folderPath = normalizedFolder.endsWith('/') ? normalizedFolder : normalizedFolder + '/';

        if (normalizedPath.startsWith(folderPath) || normalizedPath.startsWith(normalizedFolder)) {
            return true;
        }
    }

    // Check excluded patterns
    const fileName = normalizedPath.split('/').pop() || '';

    for (const pattern of settings.excludedPatterns) {
        // Check against full path and just filename
        if (matchesPattern(normalizedPath, pattern) || matchesPattern(fileName, pattern)) {
            return true;
        }
    }

    return false;
}

/**
 * Filter notes that should be excluded
 */
export function filterExcludedNotes(
    notes: Record<string, any>,
    settings: ReadingTimeStatSettings
): Record<string, any> {
    const filtered: Record<string, any> = {};

    for (const [path, stats] of Object.entries(notes)) {
        if (!shouldExclude(path, settings)) {
            filtered[path] = stats;
        }
    }

    return filtered;
}