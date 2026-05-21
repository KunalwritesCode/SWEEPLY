import { auth, signIn, signOut } from "@/auth";
import { listRecentMessages } from "@/lib/gmail";

export default async function Home() {
  const session = await auth();

  if (!session?.accessToken) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-3xl font-semibold">Inbox Cleanup</h1>
        <p className="text-gray-600">Sign in to start decluttering your Gmail.</p>
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button className="rounded-lg bg-black text-white px-5 py-2.5 hover:opacity-90">
            Sign in with Google
          </button>
        </form>
      </main>
    );
  }

  let messages: Awaited<ReturnType<typeof listRecentMessages>> = [];
  let error: string | null = null;
  try {
    messages = await listRecentMessages(session.accessToken, 20);
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Failed to load messages.";
  }

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Your recent emails</h1>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <button className="text-sm text-gray-600 hover:text-black">Sign out</button>
        </form>
      </div>
      {error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <ul className="divide-y">
          {messages.map((m) => (
            <li key={m.id} className="py-3">
              <div className="text-sm text-gray-500">{m.from}</div>
              <div className="font-medium">{m.subject || "(no subject)"}</div>
              <div className="text-sm text-gray-600 mt-1 line-clamp-1">{m.snippet}</div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
