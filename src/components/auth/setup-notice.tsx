/** Shown until Supabase keys are added to .env.local. */
export function SetupNotice() {
  return (
    <div className="flex min-h-full items-center justify-center bg-canvas px-4 py-16">
      <div className="hairline w-full max-w-[560px] rounded-[10px] bg-surface p-6 shadow-float">
        <h1 className="mb-1 text-[18px] font-semibold text-ink">Connect a Supabase project</h1>
        <p className="mb-4 text-[13px] text-ink-4">
          Care OS needs a database before anyone can sign in. Use a development project with no
          real client data.
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-[13px] text-ink">
          <li>
            Create a free project at <span className="font-medium">supabase.com</span>.
          </li>
          <li>
            Copy <code className="rounded bg-hover px-1">.env.example</code> to{" "}
            <code className="rounded bg-hover px-1">.env.local</code> and fill in the Project URL and
            keys from Project Settings → API.
          </li>
          <li>
            Set up the database: <code className="rounded bg-hover px-1">npm run db:push</code> (see
            README).
          </li>
          <li>
            Optional demo data: <code className="rounded bg-hover px-1">npm run seed</code>.
          </li>
          <li>Restart <code className="rounded bg-hover px-1">npm run dev</code>.</li>
        </ol>
      </div>
    </div>
  );
}
