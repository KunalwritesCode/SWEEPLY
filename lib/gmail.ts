import { google } from "googleapis";

export function getGmailClient(accessToken: string) {
  const oauth2 = new google.auth.OAuth2();
  oauth2.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth: oauth2 });
}

export async function listRecentMessages(accessToken: string, max = 20) {
  const gmail = getGmailClient(accessToken);

  // Step 1: get message IDs
  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults: max,
  });

  const ids = list.data.messages ?? [];
  if (ids.length === 0) return [];

  // Step 2: fetch metadata for each (batched would be better; fine for 20)
  const messages = await Promise.all(
    ids.map((m) =>
      gmail.users.messages.get({
        userId: "me",
        id: m.id!,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "Date"],
      })
    )
  );

  return messages.map((res) => {
    const headers = res.data.payload?.headers ?? [];
    const get = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
    return {
      id: res.data.id!,
      subject: get("Subject"),
      from: get("From"),
      date: get("Date"),
      snippet: res.data.snippet ?? "",
    };
  });
}
