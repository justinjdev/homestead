---
description: Verify the static build works under the GitHub Pages base path before deploying
---

Run the pre-deploy verification for Homestead. Execute each step; stop and
report on any failure.

1. **Clean prod-parity build:**
   ```bash
   BASE_PATH=/homestead npm run build
   ```
2. **Base path baked in:** verify the client bundle references `/homestead`:
   ```bash
   grep -rl '/homestead' build/_app/immutable | head -3
   ```
   Must match at least one file.
3. **Preview serves under the base path:**
   ```bash
   BASE_PATH=/homestead npm run preview -- --port 4198 --strictPort &
   sleep 2
   curl -sf http://localhost:4198/homestead | grep -qi '<html' && echo "✓ page serves"
   ```
   Then kill the preview server.
4. **Asset resolution:** extract one `_app` asset URL from the served HTML and
   curl it — must return 200.
5. **Hash state round-trip:** run the visual QA harness against the preview
   build if fixtures with non-null state exist; confirm the app renders the
   seeded state (not the default) in the screenshot.
6. Report a pass/fail table for the five checks. Fail the command if any
   check fails.
