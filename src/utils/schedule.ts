import { ScheduleEntry } from '../types';

const DAY_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

const DAY_RANGES: Record<string, number[]> = {
  weekdays: [1, 2, 3, 4, 5],
  weekends: [0, 6],
  daily: [0, 1, 2, 3, 4, 5, 6],
};

/**
 * Parse schedule string like "Mon-Fri@09:00-17:00" or "weekdays@08:00-12:00"
 */
export function parseSchedule(input: string): ScheduleEntry {
  const parts = input.split('@');
  if (parts.length !== 2) {
    console.error('Schedule format: <days>@<startTime>-<endTime>');
    console.error('Examples: Mon-Fri@09:00-17:00, weekdays@08:00-12:00, daily@22:00-06:00');
    process.exit(1);
  }

  const [dayPart, timePart] = parts;
  const days = parseDays(dayPart);
  const { startTime, endTime } = parseTimeRange(timePart);

  return { days, startTime, endTime };
}

function parseDays(input: string): number[] {
  const lower = input.toLowerCase();

  if (DAY_RANGES[lower]) {
    return DAY_RANGES[lower];
  }

  // Handle range like Mon-Fri
  if (lower.includes('-')) {
    const [startStr, endStr] = lower.split('-');
    const start = DAY_MAP[startStr];
    const end = DAY_MAP[endStr];
    if (start === undefined || end === undefined) {
      console.error(`Unknown day: "${startStr}" or "${endStr}"`);
      process.exit(1);
    }
    const days: number[] = [];
    let current = start;
    while (current !== end) {
      days.push(current);
      current = (current + 1) % 7;
    }
    days.push(end);
    return days;
  }

  // Handle comma-separated: Mon,Wed,Fri
  const dayNames = lower.split(',');
  return dayNames.map((d) => {
    const num = DAY_MAP[d.trim()];
    if (num === undefined) {
      console.error(`Unknown day: "${d.trim()}"`);
      process.exit(1);
    }
    return num;
  });
}

function parseTimeRange(input: string): { startTime: string; endTime: string } {
  const [start, end] = input.split('-');
  if (!start || !end) {
    console.error(`Invalid time range: "${input}". Use HH:MM-HH:MM format.`);
    process.exit(1);
  }

  validateTime(start);
  validateTime(end);

  return { startTime: start, endTime: end };
}

function validateTime(time: string): void {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    console.error(`Invalid time: "${time}". Use HH:MM format (24h).`);
    process.exit(1);
  }
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours > 23 || minutes > 59) {
    console.error(`Invalid time: "${time}".`);
    process.exit(1);
  }
}

export function formatScheduleDescription(schedule: ScheduleEntry): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = schedule.days.map((d) => dayNames[d]).join(', ');
  return `${days} from ${schedule.startTime} to ${schedule.endTime}`;
}
