import { validateAttachment } from './attachments.js';
// Shared validation for the browser and build. Content is always rendered as text.
export function validateNoticeText(item, hasAttachment=false) {
  if (!item || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 160 ||
      typeof item.body !== 'string' || (!item.body.trim() && !hasAttachment) || item.body.length > 8000) throw new Error('A title and text or attachment are required.');
  const date = item.date ?? '';
  if (typeof date !== 'string' || (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10)!==date))) throw new Error('Use a valid YYYY-MM-DD date.');
  return {title:item.title.trim(),body:item.body.trim(),date};
}
export function validateAnnouncements(input) {
  if (!input || !Array.isArray(input.announcements) || input.announcements.length > 20) {
    throw new Error('Use an announcements array with at most 20 entries.');
  }
  return input.announcements.map(item => {
    const attachment = item?.attachment == null ? null : validateAttachment(item.attachment);
    return {...validateNoticeText(item,Boolean(attachment)),...(typeof item.id==='string' && /^[A-Za-z0-9_-]{1,128}$/.test(item.id)?{id:item.id}:{}),...(attachment?{attachment}:{})};
  }).sort((a, b) => b.date.localeCompare(a.date));
}
