/**
 * Get the appropriate font size for a title based on its length
 * @param title - The title text
 * @returns The font size to use for display
 */
export function getTitleFontSize(title: string): number {
  const length = title.length
  if (length <= 10) {
    return 0.15  // Large size (same as current "New Entry")
  } else if (length <= 20) {
    return 0.12  // Medium size
  } else {
    return 0.10  // Small size (for 21+ characters)
  }
}

/**
 * Truncate a title if it's longer than 30 characters
 * @param title - The title text to truncate
 * @returns The truncated title with ellipsis if needed
 */
export function truncateTitle(title: string): string {
  if (title.length <= 30) {
    return title
  }
  
  // Find the last alphanumeric character before position 27 (counting backwards)
  for (let i = 26; i >= 0; i--) {
    if (/[a-zA-Z0-9]/.test(title[i])) {
      return title.substring(0, i + 1) + '...'
    }
  }
  
  // If no alphanumeric found, just truncate at 27
  return title.substring(0, 27) + '...'
}

/**
 * Get the display title and font size for an entry
 * @param title - The raw title text
 * @returns Object with displayTitle and fontSize
 */
export function getDisplayTitle(title: string): { displayTitle: string; fontSize: number } {
  const displayTitle = truncateTitle(title)
  const fontSize = getTitleFontSize(displayTitle)
  return { displayTitle, fontSize }
}