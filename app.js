import {
  parse, converter, formatHex, formatRgb, formatHsl,
  wcagContrast, inGamut, clampChroma
} from "https://cdn.jsdelivr.net/npm/culori@4.0.2/+esm";
import {
  APCAcontrast, sRGBtoY
} from "https://cdn.jsdelivr.net/npm/apca-w3@0.1.9/+esm";

const $ = (selector) => document.querySelector(selector);
const root = document.documentElement;
const toOklch = converter("oklch");
const toOklab = converter("oklab");
const toP3 = converter("p3");
const toHsl = converter("hsl");
const toRgb = converter("rgb");
const number = (value, digits = 4) => String(Number(value.toFixed(digits)));
const clamp01 = (value) => Math.min(1, Math.max(0, value));

const LABELS = {
  rgb: "RGB", hsl: "HSL", oklch: "OKLCH", oklab: "OKLab",
  p3: "Display P3", lab: "Lab", lch: "LCH"
};

function detectColor(value) {
  const input = value.trim();
  if (!input) return null;

  const numeric = "[-+]?(?:\\d+\\.?\\d*|\\.\\d+)";
  let css = input;
  let label = null;

  if (new RegExp(`^${numeric}(?:deg)?\\s+${numeric}%\\s+${numeric}%$`).test(input)) {
    css = `hsl(${input})`;
    label = "HSL";
  } else if (/^#?[\\da-f]{3,4}(?:[\\da-f]{2}){0,2}$/i.test(input)) {
    const hex = input.replace(/^#/, "");
    if (![3, 4, 6, 8].includes(hex.length)) return null;
    css = `#${hex}`;
    label = "HEX";
  } else if (new RegExp(`^${numeric}\\s+${numeric}\\s+${numeric}$`).test(input)) {
    css = `rgb(${input})`;
    label = "RGB";
  }

  const color = parse(css);
  if (!color) return null;
  return { color, label: label || (input.startsWith("#") ? "HEX" : LABELS[color.mode] || color.mode.toUpperCase()) };
}

function copyText(value, button) {
  const original = button.textContent;
  const done = (success) => {
    button.textContent = success ? "Copied" : "Failed";
    button.disabled = true;
    window.setTimeout(() => {
      button.textContent = original;
      button.disabled = false;
    }, 1200);
  };

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(value).then(() => done(true), () => fallbackCopy(value, done));
  } else {
    fallbackCopy(value, done);
  }
}

function fallbackCopy(value, done) {
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.cssText = "position:fixed;inset:0 auto auto -9999px";
  document.body.append(field);
  field.select();
  let success = false;
  try { success = document.execCommand("copy"); } catch { /* Clipboard unavailable. */ }
  field.remove();
  done(success);
}

function updateAccent(color) {
  const hue = toHsl(color)?.h;
  root.style.setProperty("--h", Number.isFinite(hue) ? Math.round(hue) : 258);
}

function renderGamut(color) {
  const results = [
    [inGamut("rgb")(color), "sRGB"],
    [inGamut("p3")(color), "Display P3"]
  ];
  $("#gamut-results").replaceChildren(...results.map(([inside, label]) => {
    const item = document.createElement("div");
    item.className = "gamut-item";
    item.dataset.ok = String(inside);
    const mark = document.createElement("span");
    mark.className = "gamut-indicator";
    mark.textContent = inside ? "✓" : "!";
    const text = document.createElement("span");
    text.textContent = `${label} · ${inside ? "in gamut" : "out of gamut"}`;
    item.append(mark, text);
    return item;
  }));
}

function renderOutputs(color) {
  const oklch = toOklch(color);
  const oklab = toOklab(color);
  const p3 = toP3(color);
  const hue = Number.isFinite(oklch.h) ? oklch.h : 0;
  const oklchText = `oklch(${number(oklch.l)} ${number(oklch.c)} ${number(hue, 2)})`;
  const p3Text = `color(display-p3 ${number(clamp01(p3.r))} ${number(clamp01(p3.g))} ${number(clamp01(p3.b))})`;
  const srgbColor = clampChroma(oklch, "oklch", "rgb");

  return [
    ["HEX", formatHex(srgbColor)],
    ["RGB", formatRgb(srgbColor)],
    ["HSL", formatHsl(srgbColor)],
    ["OKLCH", oklchText],
    ["OKLab", `oklab(${number(oklab.l)} ${number(oklab.a)} ${number(oklab.b)})`],
    ["Display P3", p3Text],
    ["CSS variable", `--color-brand: ${oklchText};`],
    ["Tailwind v4", `@theme {\n  --color-brand: ${oklchText};\n}`]
  ];
}

function invalidColor(message) {
  $("#color-preview").style.background = "";
  $("#color-status").textContent = "Invalid input";
  $("#detected").textContent = "AUTO-DETECT";
  $("#convert-error").textContent = message;
  $("#output-list").replaceChildren();
  $("#gamut-results").replaceChildren();
  $("#copy-all").disabled = true;
  allOutput = "";
}

let allOutput = "";

function updateConversion() {
  $("#convert-error").textContent = "";
  const result = detectColor($("#color-input").value);
  if (!result) {
    invalidColor("Enter a valid CSS color or a supported bare RGB/HSL value.");
    return;
  }

  try {
    const oklch = toOklch(result.color);
    if (!oklch || !Number.isFinite(oklch.l) || !Number.isFinite(oklch.c)) {
      throw new Error("This color could not be converted.");
    }

    const outputs = renderOutputs(result.color);
    const previewColor = clampChroma(oklch, "oklch", "rgb");
    $("#color-preview").style.background = formatHex(previewColor);
    $("#color-status").textContent = "Color updated";
    $("#detected").textContent = `DETECTED: ${result.label}`;
    updateAccent(result.color);
    renderGamut(result.color);

    $("#output-list").replaceChildren(...outputs.map(([name, value]) => {
      const row = document.createElement("div");
      row.className = "output-row";
      const label = document.createElement("span");
      label.className = "output-name";
      label.textContent = name;
      const output = document.createElement("output");
      output.className = "output-value";
      output.textContent = value;
      const button = document.createElement("button");
      button.className = "copy-button";
      button.type = "button";
      button.textContent = "Copy";
      button.setAttribute("aria-label", `Copy ${name}`);
      button.addEventListener("click", () => copyText(value, button));
      row.append(label, output, button);
      return row;
    }));

    allOutput = outputs.map(([name, value]) => `${name}: ${value}`).join("\\n");
    $("#copy-all").disabled = false;
  } catch (error) {
    invalidColor(error.message || "Unable to convert this color.");
  }
}

function apcaValue(foreground, background) {
  const rgb = (color) => {
    const converted = toRgb(color);
    return [converted.r, converted.g, converted.b].map((channel) => Math.round(clamp01(channel) * 255));
  };
  const textY = sRGBtoY(rgb(foreground));
  const backgroundY = sRGBtoY(rgb(background));
  return APCAcontrast(textY, backgroundY);
}

function updateContrast() {
  const foreground = detectColor($("#foreground").value);
  const background = detectColor($("#background").value);
  const error = $("#contrast-error");
  error.textContent = "";

  if (!foreground || !background) {
    error.textContent = "Enter valid foreground and background colors.";
    $("#contrast-ratio").textContent = "—";
    $("#apca-score").textContent = "—";
    $("#contrast-checks").replaceChildren();
    return;
  }

  try {
    const ratio = wcagContrast(foreground.color, background.color);
    const apca = apcaValue(foreground.color, background.color);
    $("#contrast-sample").style.color = formatHex(foreground.color);
    $("#contrast-sample").style.background = formatHex(background.color);
    $("#contrast-ratio").textContent = `${ratio.toFixed(2)}:1`;
    $("#apca-score").textContent = Number.isFinite(apca) ? `${Math.abs(apca).toFixed(1)} Lc` : "—";

    const criteria = [
      ["AA · normal text", 4.5],
      ["AA · large text / UI", 3],
      ["AAA · normal text", 7],
      ["AAA · large text", 4.5]
    ];
    $("#contrast-checks").replaceChildren(...criteria.map(([label, minimum]) => {
      const passed = ratio >= minimum;
      const item = document.createElement("div");
      item.className = "check";
      item.dataset.ok = String(passed);
      const name = document.createElement("span");
      name.textContent = `${label} (${minimum}:1)`;
      const status = document.createElement("b");
      status.textContent = passed ? "PASS ✓" : "FAIL ✕";
      item.append(name, status);
      return item;
    }));
  } catch {
    error.textContent = "These colors could not be compared.";
  }
}

const tabs = [...document.querySelectorAll('[role="tab"]')];
function activateTab(tab) {
  tabs.forEach((item) => {
    const active = item === tab;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-selected", String(active));
    item.tabIndex = active ? 0 : -1;
    $(`#${item.getAttribute("aria-controls")}`).hidden = !active;
  });
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => activateTab(tab));
  tab.addEventListener("keydown", (event) => {
    const direction = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (direction === undefined) return;
    event.preventDefault();
    const next = tabs[(index + direction + tabs.length) % tabs.length];
    activateTab(next);
    next.focus();
  });
});

$("#color-input").addEventListener("input", updateConversion);
$("#copy-all").addEventListener("click", () => {
  if (allOutput) copyText(allOutput, $("#copy-all"));
});
["#foreground", "#background"].forEach((selector) => $(selector).addEventListener("input", updateContrast));
$("#swap-colors").addEventListener("click", () => {
  const foreground = $("#foreground");
  const background = $("#background");
  [foreground.value, background.value] = [background.value, foreground.value];
  updateContrast();
});

updateConversion();
updateContrast();
