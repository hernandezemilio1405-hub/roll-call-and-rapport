<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- App data (groups, students, criteria, attendance, participations) is read and written from the browser with the generated Supabase client under RLS owner policies (`user_id = auth.uid()`); there are no server functions. Why: single-teacher app, RLS is the security boundary.
- All signed-in pages live under `src/routes/_authenticated/` (client-only, `ssr: false`) and share `AppShell`; `/`, `/auth`, `/reset-password` are public.
- Query factories and the paged `fetchAll` helper live in `src/lib/db.ts`; reuse them so long periods are never cut at the 1000-row API limit.
- Stats math lives in `src/lib/stats.ts`, CSV parsing in `src/lib/csv.ts`, PDF generation (jspdf, dynamically imported) in `src/lib/pdf.ts`; each pure module has tests in `src/test/`.
- Participations snapshot `criterion_name` and `points` at insert time so editing or deleting a criterion never rewrites history.
