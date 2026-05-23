interface GmailListResponse {
  messages?: { id: string; threadId: string }[];
  resultSizeEstimate?: number;
}

interface GmailMessageResponse {
  id: string;
  payload?: {
    headers?: { name: string; value: string }[];
  };
  snippet?: string;
  internalDate?: string;
}

const QUERY =
  'newer_than:30d (interview OR internship OR scholarship OR hackathon OR "career fair" OR workshop OR networking OR mentorship OR volunteer OR "student membership" OR "job opportunity")';

async function gFetch(url: string, accessToken: string) {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Gmail ${r.status}: ${text.slice(0, 200)}`);
  }
  return r.json();
}

export interface GmailMessageLite {
  id: string;
  subject: string;
  sender: string;
  snippet: string;
  date: string;
}

export async function fetchGmailOpportunities(
  accessToken: string,
  maxResults = 10,
): Promise<GmailMessageLite[]> {
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(QUERY)}`;
  const list = (await gFetch(listUrl, accessToken)) as GmailListResponse;
  if (!list.messages || list.messages.length === 0) return [];
  const results: GmailMessageLite[] = [];
  for (const m of list.messages.slice(0, maxResults)) {
    try {
      const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`;
      const detail = (await gFetch(detailUrl, accessToken)) as GmailMessageResponse;
      const headers = detail.payload?.headers || [];
      const get = (n: string) => headers.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value || "";
      results.push({
        id: m.id,
        subject: get("Subject"),
        sender: get("From"),
        snippet: detail.snippet || "",
        date: get("Date") || new Date(Number(detail.internalDate || Date.now())).toISOString(),
      });
    } catch (err) {
      console.warn("gmail detail failed", m.id, (err as Error).message);
    }
  }
  return results;
}
