# Playtest feedback and debug control

## User feedback — 2026-09-09

- The opening five minutes are not yet fun; achievements lack a tangible payoff.
- A roughly 30-minute game may be preferable to the original 4–6-hour target. This is a direction to test, not a validated balance target.
- News is easily missed and its writing feels generic/AI-like.
- Expanding music layers feel good, but the score completes too early relative to progression. Five stages may be too few.
- User plans a fresh-start recorded playtest. Do not reset the player's save automatically.

## Implemented for testing

- Button below music toggles an exact 10,000 SUSHI per tap, including the mobile dock. No multiplier stacking.
- Starts OFF on page load; runtime-only flag is not saved. Schema stays v2; save IDs/keys unchanged.
- Each tap remains one click. Earned SUSHI, achievements and purchases are real progress and auto-save normally. Export a Save Code before testing; turning OFF does not undo gains.
- Music, narrative and economy intentionally unchanged for the next baseline recording.

## Next design pass after recording

- Inspect time to first meaningful purchase, visible reward, first surprise and each musical expansion.
- Make facility purchases produce visible changes before adding more content or shortening waits blindly.
- Spread musical changes across the experience, exploring phrase/instrument changes as well as layer count.
