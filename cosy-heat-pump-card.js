// Cosy Heat Pump Card - an Octopus Cosy 6 outdoor unit for Home Assistant
// dashboards, with a fan that spins while the heat pump runs.
// https://github.com/adamlc/cosy-heat-pump-card

const VERSION = "1.0.0";

// Turns per second of the drawn fan when the source only says on/off.
const DEFAULT_SPEED = 0.8;
// Real RPM (~400-900) would strobe on screen, so with an RPM sensor the drawn
// fan turns once a second per this many RPM.
const DEFAULT_RPM_PER_TURN = 600;

const HEAT = "var(--state-climate-heat-color, #ff8100)";
const WATER = "var(--blue-color, #2196f3)";
const DEFROST = "var(--cyan-color, #00bcd4)";
const COOL = "var(--state-climate-cool-color, #2b9af9)";
const IDLE = "var(--disabled-text-color, #888)";

// Keys are lower-case. Covers climate hvac_action values plus common
// operating-state strings from local Modbus/MQTT setups.
const DEFAULT_STATES = {
  heating: { label: "Heating", color: HEAT },
  heat: { label: "Heating", color: HEAT },
  preheating: { label: "Preheating", color: HEAT },
  dhw: { label: "Hot water", color: WATER },
  hot_water: { label: "Hot water", color: WATER },
  defrost: { label: "Defrosting", color: DEFROST },
  defrosting: { label: "Defrosting", color: DEFROST },
  cooling: { label: "Cooling", color: COOL },
  idle: { label: "Idle", color: IDLE },
  standby: { label: "Standby", color: IDLE },
  off: { label: "Off", color: IDLE },
};

const ON_STATES = new Set(["on", "true", "running", "heating", "heat", "preheating", "dhw", "hot_water", "defrost", "defrosting", "cooling", "active"]);

// Traced from a close-up of the hub sticker.
const OCTOPUS =
  "M27 137 C31 133 33 129 31 124 C24 116 20.5 106 20.8 96 C21.5 64 47 41.5 77.5 41.5 C108 41.5 134 64 134 96 C134 112 127 124 122 131 C121 137 123 142 122 145 C117 147 111 147 106 145 C111 148 114 151 114.5 156 C107 159 98 157 92 152 C90 159 85 164 78 164 C70 164 66 158 64 152 C56 155 46 155 33 152 C36 147 40 143 44 141 C38 140 32 139 27 137 Z";
const BLADES = 7;
const BLADE = "M-3 -26 C 5 -34 13 -46 13 -59 C 7 -59 -1 -52 -6 -42 C -8 -35 -7 -29 -3 -26 Z";

function grille() {
  let out = "";
  for (let r = 31; r <= 58; r += 3.4) out += `<circle r="${r}"/>`;
  // Swept spokes like the real grille, which curve against the blades.
  for (let i = 0; i < 36; i++) {
    out += `<path transform="rotate(${(i * 360) / 36})" d="M0 -28 Q 14 -42 7 -59"/>`;
  }
  return out;
}

const LOGO = `
    <g transform="scale(.285) translate(-77.4 -103)">
      <path fill="#ff71cf" d="${OCTOPUS}"/>
      <g fill="#f5f2e8"><circle cx="54" cy="105" r="12.6"/><circle cx="96" cy="106" r="12"/></g>
      <g fill="#303236"><circle cx="55.6" cy="107" r="9.6"/><circle cx="97.5" cy="108" r="9.1"/></g>
      <g fill="#f5f2e8"><circle cx="50" cy="101" r="2.6"/><circle cx="91.5" cy="102.5" r="2.4"/></g>
      <g fill="#303236"><ellipse cx="42.5" cy="83" rx="3" ry="1.4" transform="rotate(-12 42.5 83)"/><ellipse cx="110.5" cy="85" rx="3" ry="1.4" transform="rotate(12 110.5 85)"/></g>
      <path d="M68 124.5 Q73.5 131 79 124.5" fill="none" stroke="#303236" stroke-width="2.2" stroke-linecap="round"/>
    </g>`;

// Outline fitted to a front-on product photo of the 855 x 1125 mm unit. The
// fan sits on a face that curves back from about halfway up, so seen level it
// is an ellipse rather than a circle.
const svg = (showLogo) => `
<svg viewBox="12 2 194 230" role="img" aria-label="Heat pump">
  <defs>
    <linearGradient id="shade" x1="20" x2="180" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000" stop-opacity=".5"/>
      <stop offset=".07" stop-color="#000" stop-opacity=".28"/>
      <stop offset=".22" stop-color="#000" stop-opacity=".06"/>
      <stop offset=".42" stop-color="#fff" stop-opacity=".06"/>
      <stop offset=".62" stop-color="#fff" stop-opacity=".02"/>
      <stop offset=".82" stop-color="#000" stop-opacity=".12"/>
      <stop offset=".94" stop-color="#000" stop-opacity=".3"/>
      <stop offset="1" stop-color="#000" stop-opacity=".5"/>
    </linearGradient>
    <linearGradient id="slope" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".16"/>
      <stop offset=".3" stop-color="#fff" stop-opacity=".04"/>
      <stop offset="1" stop-color="#000" stop-opacity=".08"/>
    </linearGradient>
    <filter id="speckle" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="4"/>
      <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2.2 1.25"/>
      <feComposite in2="SourceGraphic" operator="in"/>
    </filter>
    <path id="upper-shape" d="M20 130 V117.7 L23.5 50 C24.4 32 61 10 100 10 C139 10 175.6 32 176.5 50 L180 117.7 V130 Z"/>
    <path id="lower-shape" d="M20 126 V129 C20 160 20.5 190 21.1 207 C21.1 216 28 220.5 40 220.5 H160 C172 220.5 178.9 216 178.9 207 C179.5 190 180 160 180 129 V126 Z"/>
    <clipPath id="upper"><use href="#upper-shape"/></clipPath>
    <clipPath id="lower"><use href="#lower-shape"/></clipPath>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>
    <clipPath id="hole"><circle r="60"/></clipPath>
  </defs>

  <g filter="url(#soft)" fill="#000">
    <g transform="translate(10 5)" opacity=".2"><use href="#upper-shape"/><use href="#lower-shape"/></g>
    <ellipse cx="114" cy="221" rx="92" ry="6" opacity=".3"/>
  </g>
  <g clip-path="url(#lower)">
    <rect width="200" height="240" fill="#4b4e53"/>
    <rect width="200" height="240" fill="#4b4e53" filter="url(#speckle)" opacity=".2"/>
    <rect width="200" height="240" fill="url(#shade)"/>
  </g>
  <g clip-path="url(#upper)">
    <rect width="200" height="131" fill="#4b4e53"/>
    <rect width="200" height="131" fill="#4b4e53" filter="url(#speckle)" opacity=".2"/>
    <rect width="200" height="131" fill="url(#slope)"/>
    <rect width="200" height="131" fill="url(#shade)"/>
  </g>
  <path d="M20 129 H180" fill="none" stroke="#000" stroke-opacity=".18" stroke-width=".5"/>

  <g transform="translate(100 63.2) scale(.786 .678)">
    <circle r="62.5" fill="#35383c"/>
    <circle r="60" fill="#0d0e0f"/>
    <g clip-path="url(#hole)">
      <g class="blades" fill="#2a2d30" stroke="#3a3e42" stroke-width=".6">
        ${Array.from({ length: BLADES }, (_, i) => `<path d="${BLADE}" transform="rotate(${(i * 360) / BLADES})"/>`).join("")}
      </g>
      <g fill="none" stroke="#45494e" stroke-width=".8">${grille()}</g>
    </g>
    <circle r="28" fill="#2a2c2f"/>
    <circle r="27" fill="#303236"/>
    <circle r="27" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="1"/>
    ${showLogo ? LOGO : ""}
  </g>
</svg>`;

const num = (v, fallback) => {
  const n = Number(v);
  return v === undefined || v === null || v === "" || Number.isNaN(n) ? fallback : n;
};

class CosyHeatPumpCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("cosy-heat-pump-card-editor");
  }

  static getStubConfig(hass) {
    const ids = Object.keys(hass?.states || {});
    const rpm = ids.find((id) => id.startsWith("sensor.") && /fan/.test(id) && /rpm/i.test(hass.states[id].attributes.unit_of_measurement || ""));
    const power = ids.find((id) => /^sensor\.octopus_energy_heat_pump_.*_live_power_input$/.test(id));
    const climate = ids.find((id) => id.startsWith("climate.") && hass.states[id].attributes.hvac_action !== undefined);
    return { entity: rpm || power || climate || "", state_entity: climate || "" };
  }

  setConfig(config) {
    const entity = config.entity || config.fan_entity;
    if (!entity) throw new Error("Set `entity` to the fan speed sensor, or anything that says when the heat pump is running.");
    if (config.stats !== undefined && !Array.isArray(config.stats)) throw new Error("`stats` must be a list.");
    const states = { ...DEFAULT_STATES };
    for (const [k, v] of Object.entries(config.states || {})) {
      states[String(k).toLowerCase()] = typeof v === "string" ? { label: v } : v;
    }
    this._config = {
      name: "Heat pump",
      show_logo: true,
      ...config,
      entity,
      stats: (config.stats || []).map((s) => (typeof s === "string" ? { entity: s } : s)),
      states,
    };
    this._built = false;
    if (this._hass) this.hass = this._hass;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    if (!this._built) this._build();
    this._update();
  }

  getCardSize() {
    return 3;
  }

  getGridOptions() {
    return { columns: 12, rows: 3, min_rows: 2 };
  }

  disconnectedCallback() {
    if (this._easing) cancelAnimationFrame(this._easing);
    this._easing = null;
  }

  _build() {
    const c = this._config;
    const root = this.shadowRoot || this.attachShadow({ mode: "open" });
    root.innerHTML = `
      <style>
        ha-card { height: 100%; display: flex; gap: 16px; align-items: center; padding: 12px 16px; box-sizing: border-box; cursor: pointer; }
        svg { height: 100%; max-height: 156px; min-height: 96px; width: auto; flex: none; overflow: visible; }
        .info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
        .head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .name { font-size: 16px; font-weight: 500; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .chip { font-size: 12px; font-weight: 500; padding: 3px 10px; border-radius: 12px; white-space: nowrap;
                color: var(--chip); background: color-mix(in srgb, var(--chip) 18%, transparent); }
        .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; }
        .stats:empty { display: none; }
        .stat { display: flex; align-items: center; gap: 6px; min-width: 0; border-radius: 8px; margin: -2px -4px; padding: 2px 4px; }
        .stat:hover { background: color-mix(in srgb, var(--primary-text-color) 6%, transparent); }
        .stat ha-icon, .stat ha-state-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color); flex: none; }
        .stat div { min-width: 0; }
        .label { font-size: 11px; color: var(--secondary-text-color); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .value { font-size: 14px; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3; }
        .blades { will-change: transform; }
      </style>
      <ha-card>
        ${svg(c.show_logo !== false)}
        <div class="info">
          <div class="head"><span class="name"></span><span class="chip"></span></div>
          <div class="stats"></div>
        </div>
      </ha-card>`;
    root.querySelector(".name").textContent = c.name;
    root.querySelector("ha-card").addEventListener("click", () => this._moreInfo(c.entity));
    const stats = root.querySelector(".stats");
    this._statEls = c.stats.map((s) => {
      const el = document.createElement("div");
      el.className = "stat";
      el.innerHTML = `<ha-icon></ha-icon><div><div class="label"></div><div class="value"></div></div>`;
      const icon = el.querySelector("ha-icon");
      if (s.icon) icon.icon = s.icon;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this._moreInfo(s.entity);
      });
      stats.appendChild(el);
      return { s, el, icon, label: el.querySelector(".label"), value: el.querySelector(".value") };
    });
    const blades = root.querySelector(".blades");
    this._spin = blades.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], {
      duration: 1000,
      iterations: Infinity,
    });
    this._spin.playbackRate = 0;
    this._rate = 0;
    this._built = true;
  }

  _moreInfo(entityId) {
    if (!entityId) return;
    const ev = new Event("hass-more-info", { bubbles: true, composed: true });
    ev.detail = { entityId };
    this.dispatchEvent(ev);
  }

  // Turns per second for the drawn fan, from whatever the source entity is.
  _speed(st) {
    const c = this._config;
    if (!st || st.state === "unavailable" || st.state === "unknown") return 0;
    const domain = st.entity_id.split(".")[0];
    if (domain === "climate") {
      const action = String(st.attributes.hvac_action || "").toLowerCase();
      return action && !["idle", "off"].includes(action) ? num(c.speed, DEFAULT_SPEED) : 0;
    }
    const value = Number(st.state);
    if (!Number.isNaN(value) && st.state !== "") {
      if (/rpm/i.test(st.attributes.unit_of_measurement || "")) return Math.max(0, value) / num(c.rpm_per_turn, DEFAULT_RPM_PER_TURN);
      return value > num(c.running_threshold, 0) ? num(c.speed, DEFAULT_SPEED) : 0;
    }
    return ON_STATES.has(st.state.toLowerCase()) ? num(c.speed, DEFAULT_SPEED) : 0;
  }

  _update() {
    const hass = this._hass;
    const c = this._config;
    for (const { s, icon, label, value } of this._statEls) {
      const st = hass.states[s.entity];
      label.textContent = s.name || st?.attributes.friendly_name || s.entity;
      value.textContent = !st ? "—" : hass.formatEntityState ? hass.formatEntityState(st) : `${st.state} ${st.attributes.unit_of_measurement || ""}`.trim();
      if (!s.icon) icon.icon = st?.attributes.icon || "mdi:information-outline";
    }

    const speed = this._speed(hass.states[c.entity]);
    const src = c.state_entity && hass.states[c.state_entity];
    const raw = !src ? "" : src.entity_id.startsWith("climate.") ? String(src.attributes.hvac_action || src.state) : src.state;
    const known = c.states[raw.toLowerCase()];
    const chip = this.shadowRoot.querySelector(".chip");
    let label, color;
    if (known) {
      label = known.label ?? raw;
      color = known.color ?? (speed > 0 ? "var(--state-active-color, #fdd835)" : IDLE);
    } else if (raw && raw !== "unavailable" && raw !== "unknown") {
      label = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase().replace(/_/g, " ");
      color = speed > 0 ? "var(--state-active-color, #fdd835)" : IDLE;
    } else {
      label = speed > 0 ? "Running" : "Idle";
      color = speed > 0 ? "var(--state-active-color, #fdd835)" : IDLE;
    }
    chip.textContent = label;
    chip.style.setProperty("--chip", color);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this._setRate(reduce ? 0 : speed);
  }

  // Ease between speeds so a new reading spins the fan up or down rather
  // than jumping.
  _setRate(target) {
    this._target = target;
    if (this._easing) return;
    const step = () => {
      const diff = this._target - this._rate;
      this._rate = Math.abs(diff) < 0.01 ? this._target : this._rate + diff * 0.06;
      this._spin.playbackRate = this._rate;
      this._easing = this._rate !== this._target ? requestAnimationFrame(step) : null;
    };
    this._easing = requestAnimationFrame(step);
  }
}

const SCHEMA = [
  { name: "name", selector: { text: {} } },
  { name: "entity", required: true, selector: { entity: {} } },
  { name: "state_entity", selector: { entity: {} } },
  { name: "stats", selector: { entity: { multiple: true } } },
  {
    type: "expandable",
    title: "Fan speed",
    schema: [
      { name: "rpm_per_turn", selector: { number: { min: 50, max: 5000, step: 50, mode: "box" } } },
      { name: "running_threshold", selector: { number: { step: "any", mode: "box" } } },
      { name: "speed", selector: { number: { min: 0.1, max: 3, step: 0.1, mode: "box" } } },
    ],
  },
  { name: "show_logo", selector: { boolean: {} } },
];

const LABELS = {
  name: "Name",
  entity: "Fan entity",
  state_entity: "Status entity",
  stats: "Stats",
  rpm_per_turn: "RPM per turn",
  running_threshold: "Running above",
  speed: "On/off spin speed",
  show_logo: "Show octopus on the hub",
};

const HELPERS = {
  entity: "An RPM sensor, binary sensor, power sensor or climate entity - whatever says the heat pump is running.",
  state_entity: "Optional. Sets the status label; for a climate entity its current action is used.",
  stats: "Shown beside the unit, two per row. Each uses its entity's own name and icon.",
  rpm_per_turn: `RPM sensors only: real RPM per drawn turn a second (default ${DEFAULT_RPM_PER_TURN}).`,
  running_threshold: "Numeric sensors that aren't RPM, e.g. power: spins above this (default 0).",
  speed: `Turns a second when the entity only says running or not (default ${DEFAULT_SPEED}).`,
};

class CosyHeatPumpCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    if (this._config.fan_entity && !this._config.entity) this._config.entity = this._config.fan_entity;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  // The form edits stats as a plain list of entity ids; per-stat name/icon
  // overrides from YAML are carried over for entities that stay in the list.
  _formData() {
    const stats = (this._config.stats || []).map((s) => (typeof s === "string" ? s : s.entity)).filter(Boolean);
    return { ...this._config, stats, show_logo: this._config.show_logo !== false };
  }

  _changed(value) {
    const previous = new Map((this._config.stats || []).map((s) => (typeof s === "string" ? [s, s] : [s.entity, s])));
    const config = { ...this._config, ...value };
    config.stats = (value.stats || []).map((id) => previous.get(id) || id);
    for (const k of Object.keys(config)) {
      if (config[k] === "" || config[k] === undefined || (Array.isArray(config[k]) && !config[k].length)) delete config[k];
    }
    delete config.fan_entity;
    if (config.show_logo === true) delete config.show_logo;
    this._config = config;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => LABELS[s.name] || s.name;
      this._form.computeHelper = (s) => HELPERS[s.name];
      this._form.addEventListener("value-changed", (ev) => this._changed(ev.detail.value));
      const note = document.createElement("p");
      note.style.cssText = "color: var(--secondary-text-color); font-size: 13px; margin: 16px 0 0";
      note.textContent = "Custom stat names/icons and status labels are set in the code editor - see the README.";
      this.append(this._form, note);
    }
    this._form.hass = this._hass;
    this._form.data = this._formData();
    this._form.schema = SCHEMA;
  }
}

if (!customElements.get("cosy-heat-pump-card")) {
  customElements.define("cosy-heat-pump-card", CosyHeatPumpCard);
  customElements.define("cosy-heat-pump-card-editor", CosyHeatPumpCardEditor);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "cosy-heat-pump-card",
    name: "Cosy Heat Pump Card",
    description: "An Octopus Cosy 6 outdoor unit whose fan spins while the heat pump runs.",
    preview: true,
    documentationURL: "https://github.com/adamlc/cosy-heat-pump-card",
  });
  console.info(`%c COSY-HEAT-PUMP-CARD %c ${VERSION} `, "color:#fff;background:#ff71cf;font-weight:600", "color:#ff71cf;background:#222");
}
