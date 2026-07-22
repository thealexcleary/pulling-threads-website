# Design history

How this site came to look the way it does, and what to read before changing it.

Everything here is **history and rationale**, not build inputs. Nothing in this
folder is imported, compiled, or deployed — deleting it would not break the site,
but it would lose the reasoning behind the design decisions.

## What's here

| File | What it is |
|---|---|
| `2026-07-07-website-design.md` | The design spec — the decisions and why they were made |
| `2026-07-11-website-build.md` | The build plan that turned that spec into this site |
| `mockup/` | The static HTML prototype the live site was built from |
| `screenshots/` | 26 iterations captured during the build, desktop and mobile |

These were originally written in the podcast pipeline repo
(`~/Documents/pulling-threads`) and moved here on 2026-07-23 so the site's
history lives with the site.

## Decisions that are easy to get wrong later

These bit us during the build and are worth knowing before you change anything:

- **Font is Anton, not Bebas Neue.** The brand guide elsewhere says Bebas; the
  site deliberately uses Anton. Do not "correct" this.
- **The tagline is "Mostly talking shit, occasionally with great people."**
  Word order matters — it is *talking shit*, not *shit talking*.
- **Instagram handle is @pullingthreads.**
- The hero uses the staredown shot. That was a deliberate choice over the
  smiling alternatives — see the screenshots for what was rejected.

## How the site actually updates

The site rebuilds itself every morning (~6:30am AEST) from the podcast RSS feed,
so new episodes appear automatically. See the root `README.md` for the
editing instructions written for Troy.

Two things are written into this repo by automation from the pipeline repo
(`scripts/backcatalog.py`):

- `overrides/descriptions.json` — regenerated episode descriptions for older
  episodes whose original descriptions predate the current standard
- `public/images/episodes/<n>.jpg` — approved thumbnails

If you are editing either of those by hand, check that the back-catalogue job
isn't mid-run, or it will overwrite you.

## Changing the design

1. Read `2026-07-07-website-design.md` first — it explains the constraints.
2. The mockup in `mockup/` is the original prototype. It is **not** kept in sync
   with the live site; treat it as a historical reference, not a source of truth.
   The live site is `src/`.
3. Screenshots in `screenshots/` show what was tried and discarded. Worth a
   glance before re-proposing something that was already rejected.
