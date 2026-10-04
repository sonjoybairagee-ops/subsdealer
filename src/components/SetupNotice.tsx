const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Subsdealer";

/**
 * Shown instead of the site when Supabase is not configured yet. Nothing here
 * touches Supabase, so it renders even when the client cannot be created.
 */
export function SetupNotice({ missing }: { missing: string[] }) {
  return (
    <div className="shell flex min-h-screen items-center py-16">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Setup</p>
        <h1 className="mt-3 text-3xl font-black">{BRAND} is almost ready</h1>
        <p className="muted mt-3 leading-7">
          The app is running, but it has no database to talk to yet. Add the missing values
          to <code className="text-[#e5243b]">.env.local</code> and restart the dev server.
        </p>

        <div className="card mt-8 p-6">
          <p className="label">Missing from .env.local</p>
          <ul className="mt-2 space-y-2">
            {missing.map((key) => (
              <li key={key} className="flex items-center gap-3">
                <span className="text-[#ff9d9d]">✕</span>
                <code className="font-mono text-sm text-white">{key}</code>
              </li>
            ))}
          </ul>
        </div>

        <ol className="mt-8 space-y-5">
          {[
            [
              "Create a Supabase project",
              "Make a new, empty project. This app must not share a database with anything else.",
            ],
            [
              "Run the database setup",
              "Open the SQL Editor, paste the whole of RUN-THIS-IN-SUPABASE.sql, and press Run.",
            ],
            [
              "Copy the three keys",
              "Project Settings → API. Paste them into .env.local.",
            ],
            [
              "Restart the dev server",
              "Next.js only reads environment variables at startup, so a refresh is not enough.",
            ],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e5243b]/10 font-black text-[#e5243b]">
                {i + 1}
              </span>
              <div>
                <p className="font-bold text-white">{title}</p>
                <p className="muted mt-1 text-sm leading-6">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="muted mt-10 border-t border-white/[.06] pt-6 text-sm leading-6">
          Full instructions are in <code className="text-[#e5243b]">README.md</code>. Once
          the keys are in, this screen disappears on its own.
        </p>
      </div>
    </div>
  );
}
