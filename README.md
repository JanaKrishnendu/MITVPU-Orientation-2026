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
| `app.js`                | Search logic (by PRN or Name, with live suggestions)                              |
| `data.js`               | **Generated** — student roster + group schedules, loaded by `index.html` |
| `generate_data.py`      | Rebuilds`data.js` from the Excel roster + the schedule below                    |
| `Students Details.xlsx` | Source roster (SL No, PRN, Name, Program, Group)                                  |
| `UniversityLogo.webp`   | University logo used in the header                                                |
| `netlify.toml`          | Netlify hosting config                                                            |

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
