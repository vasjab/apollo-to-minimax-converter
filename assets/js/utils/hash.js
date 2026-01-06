/**
 * Hash Utility
 * Simple hash function for generating customer codes
 */

/**
 * Generates a simple hash code from a string
 * Uses dual hash calculations for better distribution
 * Returns alphanumeric code (0-9, A-Z) of 6-8 characters
 *
 * @param {string} str - Input string to hash
 * @returns {string} Alphanumeric hash code
 */
export function simpleHash(str) {
    let hash = 0;
    let hash2 = 0;

    // Use two different hash calculations for better distribution
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer

        // Second hash using different multiplier
        hash2 = ((hash2 << 3) + hash2) + char;
        hash2 = hash2 & hash2;
    }

    // Combine both hashes for better uniqueness
    const combined = Math.abs(hash) + Math.abs(hash2);

    // Convert to base36 for alphanumeric code (0-9, A-Z)
    let code = combined.toString(36).toUpperCase();

    // Ensure minimum length and pad if needed
    while (code.length < 6) {
        code = '0' + code;
    }

    // Return first 8 characters (or full code if shorter)
    return code.substring(0, 8);
}
