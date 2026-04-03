export function buildScheduledAt(input: {
  date: string;
  startTime?: string;
  allDay?: boolean;
}) {
  const [year, month, day] = input.date.split('-').map((value) => parseInt(value, 10));

  if (!year || !month || !day) {
    return '';
  }

  if (input.allDay) {
    return new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
  }

  const [hours, minutes] = (input.startTime || '00:00')
    .split(':')
    .map((value) => parseInt(value, 10));

  return new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0).toISOString();
}
