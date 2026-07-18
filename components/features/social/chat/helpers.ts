import { formatDate, formatRelativeDay } from '@/lib/i18n/format';

/** Date divider label — "TODAY" / "YESTERDAY" / weekday / full date, upper-cased. */
export function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays <= 1) return formatRelativeDay(diffDays).toUpperCase();
  if (diffDays < 7) return formatDate(date, { weekday: 'long' }).toUpperCase();
  return formatDate(date).toUpperCase();
}

export function formatMessageTime(iso: string): string {
  return formatDate(iso, { hour: '2-digit', minute: '2-digit', hour12: false });
}
