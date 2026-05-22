import { auth, signIn, signOut } from "@/auth";
import InboxCleanup from "@/components/InboxCleanup";
import SpotlightButton from "@/components/SpotlightButton";
import { getRecipes } from "@/lib/recipes";

function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const icon = size === "lg" ? "h-7 w-7" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <div
      className={`${box} ${size === "lg" ? "animate-logo-glow" : "shadow-lg shadow-indigo-500/20"} shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center`}
    >
      <svg className={`${icon} text-white`} viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 1l2.39 6.26H19l-5.44 3.95 2.08 6.4L10 14.1l-5.64 3.51 2.08-6.4L1 7.26h6.61z" />
      </svg>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default async function Home() {
  const session = await auth();

  if (!session?.accessToken) {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center gap-8 p-8 overflow-hidden">
        {/* Soft ambient background */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[38%] h-[440px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-blue-200/50 via-indigo-200/40 to-transparent blur-3xl" />
        </div>

        <div className="flex flex-col items-center text-center animate-fade-up">
          <Logo size="lg" />
          <h1 className="mt-6 text-4xl font-semibold tracking-tight">Sweeply</h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-gray-500">
            Describe what you want cleaned. AI finds it, you approve, it&apos;s gone.
          </p>
        </div>

        <form
          className="animate-fade-up"
          style={{ animationDelay: "0.12s" }}
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <SpotlightButton className="rounded-xl bg-black px-6 py-3 text-sm font-medium text-white shadow-lg shadow-black/10 transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0">
            <GoogleIcon />
            Sign in with Google
          </SpotlightButton>
        </form>
      </main>
    );
  }

  let savedRecipes = [];
  if (session.user?.email) {
    try {
      savedRecipes = await getRecipes(session.user.email);
    } catch (err) {
      console.error("Failed to load recipes on first load:", err);
      // Fail silently — user sees empty recipes list, not a crash
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto animate-fade-up">

        {session.error === "RefreshAccessTokenError" && (
          <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-yellow-800">
              Your session expired. Please sign in again to continue.
            </p>
            <form
              action={async () => {
                "use server";
                await signIn("google");
              }}
            >
              <button className="text-sm font-medium text-yellow-900 underline underline-offset-2 whitespace-nowrap">
                Sign in again
              </button>
            </form>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Sweeply</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Signed in as {session.user?.email}
              </p>
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <button className="text-sm text-gray-500 hover:text-black transition-colors">
              Sign out
            </button>
          </form>
        </div>

        <InboxCleanup savedRecipes={savedRecipes} />
      </div>
    </main>
  );
}
