import type { EventSubtype } from "@/types";

export const EVENT_DURATION_BY_TYPE: Record<EventSubtype, number> = {
  hackathon: 480,
  competition: 240,
  networking: 120,
  workshop: 90,
  meetup: 120,
  conference: 360,
  webinar: 60,
  "career fair": 180,
};

export function defaultDurationMinutesForEvent(eventType: EventSubtype): number {
  return EVENT_DURATION_BY_TYPE[eventType] ?? 60;
}
