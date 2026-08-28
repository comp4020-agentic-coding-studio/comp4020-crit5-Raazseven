# Process overview

A reading-guide to how the work came together --- a map to your process, not an
essay about it.

## What I built

A "Where's Waldo" sniper game: a scattered dusk-lit crowd of developer/deploy
personas (Backend Engineer, Security, Docs Writer, ...) fills the screen, one
of them is the anomaly hiding in a cluster of its own lookalikes, and the
player has to spot and click it before the timer runs out. Each anomaly's
severity (low/moderate/high) is shown at a glance via a colored torso outline,
but the round is timed and mistakes are budgeted per severity, so spotting
fast and correctly still matters. Missing badly enough on a `high`-severity
anomaly ends the run in a nuke sequence; enough clean hits wins it.

## The moments that mattered

1. **Sniper-scene reskin, not a card grid.** The brief's early feedback was
   blunt: a flat grid of file-icon cards "looks so bad", and the ask was for
   "a real sniper game like Sniper 3D" where the anomaly is a person in a
   crowd. Instead of just changing the icons, I rebuilt the round data around
   roles/uniforms and the layout around a jittered, depth-scaled scattered
   placement (`computeLayout`) behind a skyline/scope-vignette backdrop, so
   the anomaly hides inside a genuine cluster of its own lookalikes rather
   than being shuffled anywhere on a grid. I checked it by screenshotting the
   live scene with Playwright and confirming the cluster read as a crowd, not
   a lineup, before moving on.
   [`ed4e1a4`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Raazseven/commit/ed4e1a4)

2. **A caught contrast bug, generalized past the roles in play.** While
   reviewing the severity-outline mechanic, a real question came up: some
   role shirts (`build`'s gold, `legal`'s gold, `release`'s orange) sit close
   enough to the low/moderate outline colors that the outline could blend
   into the shirt. Rather than just checking the roles currently used by the
   9 anomaly definitions, I fixed it structurally with a dark halo drawn
   behind every colored outline, and wrote a test that iterates all 14 roles
   x 3 severities so the fix holds even if the anomaly roster changes later.
   [`773fd63`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Raazseven/commit/773fd63)

   > but are there dress and the oultine same colour if so they wont be
   > visible

3. **A silent mechanic made legible, and a real update-timing bug caught
   along the way.** A question about why a wrong click doesn't always end
   the game surfaced that `MISTAKE_LIMIT` (a per-severity forgiveness budget)
   was invisible in the HUD. Adding the readout, I found the obvious call
   site (`updateHud()`, called after `activeAnomaly` is nulled in
   `resolveRound`) would silently no-op and leave the counter stale until the
   next round started. I reworked `updateMistakesHud` to take an explicit
   severity argument instead of reading module state, then verified with a
   Playwright script that clicked a decoy and confirmed the counter updated
   immediately (`0/3` -> `1/3`) rather than after the pause.
   [`ab5d186`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Raazseven/commit/ab5d186)

## Checks that carried over

`spec/crit-5.test.ts` and `spec/tells.test.ts` assert the mistake-budget/win
rules and the outline/halo contract directly against `game.ts` and
`people.ts`, so a future change to pacing or the role roster gets caught
immediately rather than only at the crit.
[`b57fbde`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Raazseven/commit/b57fbde)
