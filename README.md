# Cosy Heat Pump Card

A Home Assistant dashboard card that draws an Octopus Cosy 6 outdoor unit,
with a fan that spins while your heat pump is running. With a fan-speed
sensor, it spins faster and slower with the real fan.

![Cosy Heat Pump Card](images/card.png)

It works with whatever your setup exposes:

| Fan source (`entity`) | What the fan does |
| --- | --- |
| RPM sensor (unit `RPM`), e.g. from a local Modbus reader | Speed follows the real RPM |
| Binary sensor / switch / anything `on`/`off` | Spins at a fixed speed when on |
| Power sensor, e.g. the Octopus Energy integration's `live_power_input` | Spins when above `running_threshold` |
| Climate entity | Spins while `hvac_action` is active (heating, defrosting, …) |

Speed changes ease in and out, and the fan stays still if your system asks
for reduced motion.

> **Unofficial.** This is a fan-made card. It is not made, endorsed or
> supported by Octopus Energy. The octopus can be turned off with
> `show_logo: false`.

## Installation

### HACS

1. In HACS, open the menu (⋮) → **Custom repositories**.
2. Add `https://github.com/adamlc/cosy-heat-pump-card` with type **Dashboard**.
3. Search for **Cosy Heat Pump Card**, download it, and reload the browser.

### Manual

1. Download `cosy-heat-pump-card.js` from the
   [latest release](https://github.com/adamlc/cosy-heat-pump-card/releases/latest)
   into `config/www/`.
2. Add it under **Settings → Dashboards → ⋮ → Resources** as
   `/local/cosy-heat-pump-card.js`, type **JavaScript module**.

## Configuration

Add the card from the dashboard card picker (the visual editor covers the
main options), or in YAML:

```yaml
type: custom:cosy-heat-pump-card
entity: sensor.octopus_energy_heat_pump_xxxx_live_power_input
```

| Option | Default | Description |
| --- | --- | --- |
| `entity` | **required** | What drives the fan - see the table above. Tapping the card opens it. |
| `name` | `Heat pump` | Card title. |
| `state_entity` | none | Entity for the status label. For a climate entity its `hvac_action` is used. Without one, the label is just Running / Idle. |
| `states` | see below | Extra or replacement status labels, keyed by state (case-insensitive). |
| `stats` | none | List of entities shown beside the unit, two per row. Tapping one opens it. |
| `rpm_per_turn` | `600` | RPM sources only: real RPM per drawn turn a second. Real speeds would strobe, so the drawing is slowed down. |
| `running_threshold` | `0` | Numeric non-RPM sources (e.g. power): the fan spins above this value. |
| `speed` | `0.8` | Turns a second when the source only says running or not. |
| `show_logo` | `true` | Show the octopus on the fan hub. |

Each `stats` entry is an entity id, or an object with `entity`, and
optionally `name` and `icon`.

Status labels already known: `heating`, `heat`, `preheating`, `dhw`,
`hot_water`, `defrost`, `defrosting`, `cooling`, `idle`, `standby`, `off`.
Anything else is shown as-is. Add your own with `states`, either as a label
or a label and colour:

```yaml
states:
  legionella: Legionella cycle
  hp_dhw:
    label: Hot water
    color: var(--blue-color)
```

## Examples

### Octopus Energy integration

The [Octopus Energy integration](https://github.com/BottlecapDave/HomeAssistant-OctopusEnergy)
doesn't report fan speed, so the fan runs from power input. A Cosy draws
around 20-40 W while idle, so a small threshold stops it spinning then:

```yaml
type: custom:cosy-heat-pump-card
name: Cosy 6
entity: sensor.octopus_energy_heat_pump_xxxx_live_power_input
running_threshold: 0.05
state_entity: climate.octopus_energy_heat_pump_xxxx_zone_1
stats:
  - entity: sensor.octopus_energy_heat_pump_xxxx_live_heat_output
    name: Heat
    icon: mdi:fire
  - entity: sensor.octopus_energy_heat_pump_xxxx_live_power_input
    name: Power
    icon: mdi:flash
  - entity: sensor.octopus_energy_heat_pump_xxxx_live_cop
    name: COP
    icon: mdi:gauge
  - entity: sensor.octopus_energy_heat_pump_xxxx_live_outdoor_temperature
    name: Outside
    icon: mdi:thermometer
```

### Real fan speed

With a sensor that reports the fan in RPM, the drawn fan follows it:

```yaml
type: custom:cosy-heat-pump-card
entity: sensor.cosy_fan_speed
state_entity: sensor.cosy_operating_state
```

### On/off only

```yaml
type: custom:cosy-heat-pump-card
entity: binary_sensor.heat_pump_running
```

## Licence

MIT
