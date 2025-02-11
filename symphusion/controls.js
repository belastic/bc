"use strict";

// gui for tweaking settings
const pane = new Tweakpane.Pane({ title: "Settings" });

// initial default settings; this is needed for tweakpane to figure out types of things
let params = {
  preset: "Ocean",
  feed: 0.0174,
  kill: 0.043,
  dt: 0.5,
  iterations: 5,
  scale: 1,
  radius: 0.05,
  wrap: false,
  refraction: 0.74,
  zoom: 1,
  render: {
    palette: {
      brightness: { x: 0, y: 0.6, z: 1 },
      contrast: { x: 1, y: 1, z: 1 },
      frequency: { x: 3, y: 3, z: 3 },
      phase: { x: 0, y: 0, z: 0 },
    },
    emboss: false,
    offset: 0.1,
    pixel_size: 4.0,
    pixel_radius: 0.9,
    pixelate: false,
    screen_grain: false,
    screen_tint: "#c64962b0",
  },

  drumbit: {
    sound_kit: "tabla_drone",
    circular_pads: true,
  },
  cursor: false,
  clear: true,
  pause: false,
  fps: 0, // display purposes only
};

// presets
function setPreset(name) {
  const C = presets[name];
  params.feed = C.feed;
  params.kill = C.kill;
  params.dt = C.dt;
  params.iterations = C.iterations;
  params.scale = C.scale;
  params.radius = C.radius;
  params.wrap = C.wrap;
  params.zoom = C.zoom;
  params.refraction = C.refraction;
  params.render.palette.brightness = {
    ...C.render.palette.brightness,
  };
  params.render.palette.contrast = { ...C.render.palette.contrast };
  params.render.palette.frequency = { ...C.render.palette.frequency };
  params.render.palette.phase = { ...C.render.palette.phase };
  params.render.emboss = C.render.emboss;
  params.render.offset = C.render.offset;
  params.render.pixelate = C.render.pixelate;
  params.render.pixel_size = C.render.pixel_size;
  params.render.pixel_radius = C.render.pixel_radius;
  params.render.screen_grain = C.render.screen_grain;
  params.render.screen_tint = C.render.screen_tint;

  params.drumbit.sound_kit = C.drumbit.sound_kit;
  params.drumbit.circular_pads = C.drumbit.circular_pads;
}

let presetOptions = {};
Object.keys(presets).map((k) => {
  presetOptions[k] = k;
});
const Preset = pane.addInput(params, "preset", {
  options: presetOptions,
});
Preset.on("change", (e) => {
  setPreset(e.value);
  pane.refresh();
});

pane.addMonitor(params, "fps", {
  readonly: true,
  view: "graph",
  lineCount: 1,
  min: 10,
  max: 70,
  interval: 200,
});

// const Pause = pane.addInput(params, "pause");
const Clear = pane.addButton({ title: "Clear Canvas" });
Clear.on("click", () => (params.clear = true));

pane.addBlade({ view: "separator" });

const tabs = pane.addTab({
  pages: [{ title: "Reaction" }, { title: "Render" }, { title: "Drumbit" }],
});
const reactionTab = tabs.pages[0];
reactionTab.addInput(params, "feed", { min: 0, max: 0.1 });
reactionTab.addInput(params, "kill", { min: 0.01413, max: 0.06534 });
reactionTab.addInput(params, "dt", { label: "Delta t", min: 0.1, max: 2 });
reactionTab.addInput(params, "iterations", { min: 1, max: 10, step: 1 });
reactionTab.addInput(params, "scale", { min: 1, max: 2 });
reactionTab.addInput(params, "radius", { min: 0.001, max: 0.5 });
reactionTab.addInput(params, "wrap");
// pane.addBlade({ view: "separator" });

const renderTab = tabs.pages[1];
renderTab.addInput(params.render, "emboss");
renderTab.addInput(params.render, "pixelate");
renderTab.addInput(params.render, "offset", { min: -0.5, max: 0.5 });
renderTab.addInput(params.render, "pixel_size", { min: 1.0, max: 100.0 });
renderTab.addInput(params.render, "pixel_radius", { min: 0.2, max: 1.2 });
renderTab.addInput(params, "refraction", { min: 0.0, max: 5.0 });
renderTab.addInput(params, "zoom", { min: 1.0, max: 8.0 });
renderTab.addInput(params.render, "screen_grain");
renderTab.addInput(params.render, "screen_tint");

const Palette = renderTab.addFolder({ title: "Palette", expanded: false });
Palette.addInput(params.render.palette, "brightness", {
  x: { min: 0, max: 1 },
  y: { min: 0, max: 1 },
  z: { min: 0, max: 1 },
});

Palette.addInput(params.render.palette, "contrast", {
  x: { min: 0, max: 1 },
  y: { min: 0, max: 1 },
  z: { min: 0, max: 1 },
});

Palette.addInput(params.render.palette, "frequency", {
  x: { min: 0, max: 5 },
  y: { min: 0, max: 5 },
  z: { min: 0, max: 5 },
});

Palette.addInput(params.render.palette, "phase", {
  x: { min: 0, max: 1 },
  y: { min: 0, max: 1 },
  z: { min: 0, max: 1 },
});

const drumbitTab = tabs.pages[2];
const kitOptions = {};
for (let name in sound_files) kitOptions[name] = name;
let soundKitControl = drumbitTab.addInput(params.drumbit, "sound_kit", {
  options: kitOptions,
});
soundKitControl.on("change", (e) => {
  drumbit.soundKit(e.value);
});
drumbitTab.addInput(params.drumbit, "circular_pads");
