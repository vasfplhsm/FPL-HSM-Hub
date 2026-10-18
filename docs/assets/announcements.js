// Shared validation for the browser and build. Content is always rendered as text.
export function validateAnnouncements(input) {
  if (!input || !Array.isArray(input.announcements) || input.announcements.length > 20) {
    throw new Error('Use an announcements array with at most 20 entries.');
  }
  return input.announcements.map(item => {
    if (!item || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 160 ||
        typeof item.body !== 'string' || !item.body.trim() || item.body.length > 8000) {
      throw new Error('Each announcement needs a title (up to 160 characters) and body (up to 8000 characters).');
    }
    const date = item.date ?? '';
    if (typeof date !== 'string' || (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date))) {
      throw new Error('Announcement dates must be valid YYYY-MM-DD dates or omitted.');
    }
    return { title: item.title.trim(), body: item.body.trim(), date };
  }).sort((a, b) => b.date.localeCompare(a.date));
}
