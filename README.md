# MIT Vishwaprayaag University — Orientation Portal

A single-page site for orientation day. Students search their **PRN** or **Name**
and instantly see their Group, PRN, Program, full session schedule (with rooms),
and a welcome message.

No backend, no database, no build step — it's plain HTML/CSS/JS that runs
entirely in the browser and can be hosted anywhere that serves static files.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure |
| `style.css` | Styling (branded with MIT VPU maroon/orange) |
| `app.js` | Search logic (by PRN or Name, with live suggestions) |
| `data.js` | **Generated** — student roster + group schedules, loaded by `index.html` |
| `generate_data.py` | Rebuilds `data.js` from the Excel roster + the schedule below |
| `Students Details.xlsx` | Source roster (SL No, PRN, Name, Program, Group) |
| `UniversityLogo.webp` | University logo used in the header |
| `netlify.toml` | Netlify hosting config |

## Updating the roster

1. Edit `Students Details.xlsx` (add/remove/correct students).
2. Regenerate `data.js`:
   ```
   python generate_data.py
   ```
3. The script warns you about duplicate PRNs or any group that has no
   matching schedule. Fix those before deploying.
