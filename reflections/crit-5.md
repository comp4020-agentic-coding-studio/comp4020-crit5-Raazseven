# Crit 5 reflection

**What was the breakthrough that moved the work forward?**

The breakthrough was realizing the reskin wasn't a re-skin at all --- it was a
different game underneath. The first pass just swapped file icons for a new
palette, and it still read as a grid of cards because it was still a grid of
cards. Once I stopped treating "make it look like Sniper 3D" as a CSS problem
and rebuilt the round data itself around roles and uniforms with a scattered,
depth-jittered layout, the crowd-hiding mechanic finally matched the visual
premise instead of fighting it. The same pattern repeated at smaller scale
with the mistake-budget HUD: what looked like "just add a span" turned out to
need a real fix to when the counter updates, because the obvious call site
was reading state that had already been cleared.

**What did this work change about who I want to be as a software developer?**

It sharpened something I already believed but didn't always act on: a
correction is worth more than a patch. The shirt/outline contrast issue and
the HUD update-timing bug were both places I could have shipped a
narrower fix --- hardcode a different color for the three roles that clashed,
or leave the counter stale for one round. Instead I asked what the fix should
guarantee (contrast for any role, an accurate counter the instant a mistake
lands) and wrote the test or the refactor that made the guarantee real rather
than incidental. That's the habit I want to keep: when a bug surfaces, check
whether the fix generalizes past the specific case that exposed it, and prove
it with a test that would have caught the original case too.
