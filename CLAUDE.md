# cosy-heat-pump-card

A Home Assistant dashboard card (distributed through HACS / the HA
marketplace) that draws an Octopus Cosy 6 outdoor unit with a fan that spins
while the heat pump runs. Unofficial, not affiliated with Octopus Energy.

## Layout

- `cosy-heat-pump-card.js` - the whole card: SVG drawing, the card element
  and its visual editor. Plain JS, no build step, no dependencies - keep it
  that way. HACS serves this file by name (see `hacs.json`), so don't rename
  or move it.
- `hacs.json` - HACS/marketplace metadata.
- `images/card.gif` - README preview, made from a screen recording.
- `.github/workflows/validate.yml` - HACS validation; must stay green.

## Things that look arbitrary but aren't

- **Outline:** the body path was least-squares fitted to a front-on product
  photo of the 855 x 1125 mm unit. Hand-nudging control points brought back
  wobbles and a corner at the apex; refit instead if the shape needs changing.
- **Elliptical fan:** the fan sits on a face that curves back from about
  halfway up, so seen level it's squashed vertically (the `scale(.786 .678)`
  on the fan group). A drawing copied from an angled photo looked wrong.
- **Seam:** a faint hairline only - shadows there were rejected.
- **Speed:** real fan RPM (~400-900) strobes on screen, so RPM sources are
  divided by `rpm_per_turn` (default 600). On/off-only sources spin at
  `speed`. Changes ease through `_setRate`; reduced-motion users get a still fan.
- **Octopus pink** is `#FF71CF`, the brand colour; the shape is traced from
  a close-up of the hub sticker. `show_logo: false` must keep working.

## Compatibility

- `fan_entity` is an older name for `entity` and must keep working.
- The editor must not write defaults into the config (e.g. `show_logo:
  true`), and must keep YAML-only per-stat `name`/`icon` overrides when
  stats are reordered in the picker - see `_formData` / `_changed`.
- The Octopus Energy integration has no fan speed or running sensor; its
  `live_power_input` (kW, ~0.02-0.04 idle) with `running_threshold: 0.05`,
  or its `climate.*_zone_1` (`hvac_action`), are the supported sources.

## Testing

There's no test suite. For the card, load the JS in a plain page with stub
`ha-card`/`ha-icon` elements and a mock `hass` (`states`, plus
`formatEntityState`), and check each fan source computes the right
`_target` speed. Animation frames pause in a background tab, so read
`_target`, not `_rate`. The editor uses HA's `ha-form`, so it only renders
inside a real Home Assistant - check it there before releasing.

## Releasing

1. Bump `VERSION` in the JS (semver).
2. Commit, push, and wait for the Validate workflow to pass.
3. `gh release create vX.Y.Z cosy-heat-pump-card.js` with short notes - the
   attached file is what the README's manual-install link downloads.

Dashboards cache the file hard, so a manual install needs its resource URL's
`?v=` bumped after updating.
