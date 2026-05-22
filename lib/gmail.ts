import { google } from "googleapis";

export function getGmailClient(accessToken: string) {
  const oauth2 = new google.auth.OAuth2();
  oauth2.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth: oauth2 });
}

// Fetch up to maxPreview message IDs + metadata for preview grouping
export async function previewMessages(
  accessToken: string,
  query: string,
  maxPreview = 40
) {
  const gmail = getGmailClient(accessToken);

  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 100,
  });

  const totalEstimate = listRes.data.resultSizeEstimate ?? 0;
  const ids = (listRes.data.messages ?? []).slice(0, maxPreview);

  if (ids.length === 0) return { totalEstimate, messages: [] };

  const settled = await Promise.allSettled(
    ids.map((m) =>
      gmail.users.messages.get({
        userId: "me",
        id: m.id!,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "Date"],
      })
    )
  );

  const messages = settled
    .filter(
      (r): r is PromiseFulfilledResult<
        Awaited<ReturnType<typeof gmail.users.messages.get>>
      > => r.status === "fulfilled"
    )
    .map((r) => {
      const headers = r.value.data.payload?.headers ?? [];
      const get = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
          ?.value ?? "";
      return {
        id: r.value.data.id!,
        from: get("From"),
        subject: get("Subject"),
        date: get("Date"),
      };
    });

  return { totalEstimate, messages };
}

// Paginate all matching IDs and batch-move to TRASH
export async function trashByQuery(
  accessToken: string,
  query: string,
  cap = 5000
): Promise<number> {
  const gmail = getGmailClient(accessToken);
  let trashed = 0;
  let pageToken: string | undefined;

  do {
    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 500,
      ...(pageToken ? { pageToken } : {}),
    });

    const messages = listRes.data.messages ?? [];
    pageToken = listRes.data.nextPageToken ?? undefined;
    if (messages.length === 0) break;

    const ids = messages.map((m) => m.id!);

    await gmail.users.messages.batchModify({
      userId: "me",
      requestBody: {
        ids,
        addLabelIds: ["TRASH"],
        removeLabelIds: ["INBOX"],
      },
    });

    trashed += ids.length;
    if (trashed >= cap) break;
  } while (pageToken);

  return trashed;
}
