# MIT Vishwaprayaag University — Orientation Portal

A single-page site for orientation day. Students search their **PRN** or **Name**
and instantly see their Group, PRN, Program, full session schedule (with rooms),
and a welcome message.

No backend, no database, no build step — it's plain HTML/CSS/JS that runs
entirely in the browser and can be hosted anywhere that serves static files.

## Files

| File                      | Purpose                                                                           |
| ------------------------- | --------------------------------------------------------------------------------- |
| `index.html`            | Page structure                                                                    |
| `style.css`             | Styling (branded with MIT VPU maroon/orange)                                      |
| `app.js`                | Search logic (by PRN or Name, with live suggestions), language switching, and the "Save as Image" download |
| `translations.js`       | UI text + schedule/room translations for English, Marathi, Hindi                  |
| `html2canvas.min.js`    | Vendored copy of [html2canvas](https://html2canvas.hertzen.com/) (MIT), used to render the result card to a downloadable JPG |
| `data.js`               | **Generated** — student roster + group schedules, loaded by `index.html` |
| `generate_data.py`      | Rebuilds`data.js` from the Excel roster + the schedule below                    |
| `Students Details.xlsx` | Source roster (SL No, PRN, Name, Program, Group)                                  |
| `UniversityLogo.webp`   | University logo used in the header                                                |
| `netlify.toml`          | Netlify hosting config                                                            |

## Multilingual support

The site has an English / मराठी / हिंदी switcher in the header (persisted in
the visitor's browser via `localStorage`). Static UI text lives in
`translations.js`. Student names, PRNs, and program codes are never
translated — only the surrounding labels, messages, and the schedule/room
text that `generate_data.py` bakes into `data.js`.

`translations.js` translates schedule/room text by looking up the exact
English strings that `generate_data.py` generates (activity names like
`"Campus Tour"`, and room labels like `"Room 219 (2nd Floor)"` via a pattern
match). **If you add a new activity or change the room-label format in
`generate_data.py`, add a matching entry in `translations.js`'s
`ACTIVITY_TRANSLATIONS` / `LOCATION_TRANSLATIONS`** — anything without a
translation just falls back to showing the English text.

## Saving as an image

Once a student's result is shown, a "Save as Image" button renders the
result card (group, PRN, program, schedule, welcome message — not the
button itself) to a JPG the student can download, in whichever language is
currently selected. This uses the vendored `html2canvas.min.js` rather than
a CDN, so it keeps working even on flaky venue Wi-Fi once the page itself
has loaded.

## Updating the roster

1. Edit `Students Details.xlsx` (add/remove/correct students).
2. Regenerate `data.js`:
   ```
   python generate_data.py
   ```
3. The script warns you about duplicate PRNs or any group that has no
   matching schedule. Fix those before deploying.

## Updating the schedule

The day's session plan lives in `generate_data.py`, edited in two places,
then re-run the script. It is **not** editable from the Excel file.

- `GROUP_SCHEDULE` — the time/activity track for each group (G1-G4 run the
  LinkedIn Workshop/Cyber Security block first, G5-G8 run
  Citizenship & Responsibility/Campus Tour first, so both halves aren't in
  the Auditorium at once).
- `ROOM_BY_PROGRAM` — each program's registration room. Room and group don't
  line up 1:1, so the registration row is filled in per-student from this
  table rather than baked into `GROUP_SCHEDULE`.

## Running locally

From this folder:

```
python -m http.server 8080
```

Then open `http://localhost:8080` in a browser.

## Deploying

This is a static site — any static host works.

- **Netlify**: drag-and-drop the whole folder at [app.netlify.com/drop](https://app.netlify.com/drop), or connect this repo for git-based deploys. `netlify.toml` is already set up.
- **GitHub Pages**: push these files to a GitHub repo, then enable Pages under Settings → Pages (branch: `main`, folder: `/`).

## Note on data

Search runs entirely in the browser, so the full roster (name, PRN, program,
group) is included in `data.js` and downloaded by every visitor — not just
each student's own record. This keeps the site simple, free, and fast at
any scale (verified smooth with 1,000+ students and 200+ simultaneous
searches), at the cost of the roster being visible to anyone who inspects
the page. Treat it like a printed registration list, not confidential data.
