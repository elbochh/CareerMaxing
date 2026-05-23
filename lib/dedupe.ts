function norm(s: string | undefined | null): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function jobKey(title: string, company: string, location: string): string {
  return `${norm(title)}|${norm(company)}|${norm(location)}`;
}

export function eventKey(title: string, organizer: string, date: string): string {
  // truncate ISO to day for stability
  const day = (date || "").slice(0, 10);
  return `${norm(title)}|${norm(organizer)}|${day}`;
}

export function courseKey(title: string, provider: string): string {
  return `${norm(title)}|${norm(provider)}`;
}

export function emailKey(subject: string, sender: string, date?: string): string {
  return `${norm(subject)}|${norm(sender)}|${(date ?? "").slice(0, 10)}`;
}
