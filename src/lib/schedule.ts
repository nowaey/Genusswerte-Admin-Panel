// Tasting schedule rules — defines when each tasting recurs.
// Used to generate tasting_events in bulk for a given time range.
//
// Day of week: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday,
//              4=Thursday, 5=Friday, 6=Saturday

type WeeklySlot = {
  type: 'weekly'
  dayOfWeek: number
  time: string // "HH:MM"
}

type NthSaturdaySlot = {
  type: 'nth_saturday'
  nth: 1 | 2 | 3 | 4
  time: string // "HH:MM"
}

export type ScheduleSlot = WeeklySlot | NthSaturdaySlot

export type ScheduleRule = {
  tastingName: string
  slots: ScheduleSlot[]
}

// NOTE: Gin Tasting and Trüffel & Champagner intentionally share the 3rd Saturday.
// Both events are generated — the admin decides manually which one runs each month.

export const SCHEDULE_RULES: ScheduleRule[] = [
  {
    tastingName: 'Wein Tasting',
    slots: [
      { type: 'weekly', dayOfWeek: 4, time: '19:00' }, // Thursday
      { type: 'weekly', dayOfWeek: 5, time: '20:00' }, // Friday
      { type: 'weekly', dayOfWeek: 6, time: '20:00' }, // Saturday
    ],
  },
  {
    tastingName: 'Champagner & Popcorn',
    slots: [
      { type: 'weekly', dayOfWeek: 6, time: '12:00' }, // Every Saturday
    ],
  },
  {
    tastingName: 'Apéro & Antipasti',
    slots: [
      { type: 'weekly', dayOfWeek: 5, time: '17:00' }, // Friday
      { type: 'weekly', dayOfWeek: 6, time: '16:00' }, // Saturday
    ],
  },
  {
    tastingName: 'Afterwork Wein Tasting',
    slots: [
      { type: 'weekly', dayOfWeek: 3, time: '18:00' }, // Wednesday
    ],
  },
  {
    tastingName: 'Craft Beer Tasting',
    slots: [
      { type: 'nth_saturday', nth: 1, time: '20:00' },
    ],
  },
  {
    tastingName: 'Wagyu-Burger & Champagner',
    slots: [
      { type: 'nth_saturday', nth: 2, time: '20:00' },
    ],
  },
  {
    tastingName: 'Gin Tasting',
    slots: [
      { type: 'nth_saturday', nth: 3, time: '20:00' },
    ],
  },
  {
    tastingName: 'Trüffel & Champagner',
    slots: [
      { type: 'nth_saturday', nth: 3, time: '20:00' },
    ],
  },
]

export type GeneratedEvent = {
  tasting_name: string
  event_date: string  // YYYY-MM-DD
  start_time: string  // HH:MM:00
  own_quota: number
  franchise_quota: number
  is_open: boolean
}

function getNthSaturdayOfMonth(year: number, month: number, nth: number): Date {
  const d = new Date(year, month, 1)
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1) // find first Saturday
  d.setDate(d.getDate() + (nth - 1) * 7)              // jump to nth Saturday
  return d
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function generateEvents(months: number): GeneratedEvent[] {
  const events: GeneratedEvent[] = []

  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setMonth(end.getMonth() + months)

  for (const rule of SCHEDULE_RULES) {
    for (const slot of rule.slots) {
      if (slot.type === 'weekly') {
        const d = new Date(start)
        // Advance to first matching day of week
        const diff = (slot.dayOfWeek - d.getDay() + 7) % 7
        d.setDate(d.getDate() + diff)

        while (d < end) {
          events.push({
            tasting_name:    rule.tastingName,
            event_date:      toDateStr(d),
            start_time:      `${slot.time}:00`,
            own_quota:       6,
            franchise_quota: 24,
            is_open:         true,
          })
          d.setDate(d.getDate() + 7)
        }
      } else {
        // nth_saturday: iterate month by month
        const current = new Date(start.getFullYear(), start.getMonth(), 1)
        while (current < end) {
          const sat = getNthSaturdayOfMonth(current.getFullYear(), current.getMonth(), slot.nth)
          if (sat >= start && sat < end) {
            events.push({
              tasting_name:    rule.tastingName,
              event_date:      toDateStr(sat),
              start_time:      `${slot.time}:00`,
              own_quota:       6,
              franchise_quota: 24,
              is_open:         true,
            })
          }
          current.setMonth(current.getMonth() + 1)
        }
      }
    }
  }

  return events
}

// Count events per tasting for the preview UI
export function countByTasting(events: GeneratedEvent[]): Record<string, number> {
  return events.reduce<Record<string, number>>((acc, e) => {
    acc[e.tasting_name] = (acc[e.tasting_name] ?? 0) + 1
    return acc
  }, {})
}
