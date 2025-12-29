# Popcorn
Bite-sized snacks of information to your movie viewing experience!

## Extension quickstart
1. `cd apps/extension`.
2. Create a `.env` file with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_TMDB_API_KEY`.
3. Install dependencies and build the extension:

```bash
npm install
npm run build
```

For automatic rebuilds while editing:

```bash
npm run dev:extension
```

4. In Chrome, open `chrome://extensions`, enable Developer Mode, and load `apps/extension/dist/` as an unpacked extension.
5. Visit Netflix or Disney+ and click the Popcorn button to open the sidebar.

## Supabase schema
Use `supabase/schema.sql` to provision the tables and policies (threads, comments, content catalog, and mappings).
