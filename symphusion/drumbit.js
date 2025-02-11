/*adapted from: Beat Director by Lincoln https://openprocessing.org/sketch/2260484*/
"use strict";

const DB_PAD_SPACING = 6;
const DB_MIN_FILL_PCT = 10;
const DB_MAX_FILL_PCT = 20;
const DB_PAD_RADIUS_PCT = 15;

// beats per minute = the number of quarter beats in one minute
let BPM = 60;

let sound_files = {
  fusion_drums: {
    files: [
      "assets/fusion_drums/bass dholak.mp3",
      "assets/fusion_drums/deep.mp3",
      "assets/fusion_drums/dholak.mp3",
      "assets/fusion_drums/kick.mp3",
      "assets/fusion_drums/nagara.mp3",
      "assets/fusion_drums/snare.mp3",
      "assets/fusion_drums/tabla1.mp3",
      "assets/fusion_drums/tabla2.mp3",
    ],
  },
  tabla_drone: {
    files: [
      "assets/tabla_drone/a2 tabla.mp3",
      "assets/tabla_drone/b3 tabla.mp3",
      "assets/tabla_drone/c4 suripeti.mp3",
      "assets/tabla_drone/d4.mp3",
      "assets/tabla_drone/d4 suripeti.mp3",
      "assets/tabla_drone/d4 t2.mp3",
      "assets/tabla_drone/e4 t2.mp3",
      "assets/tabla_drone/e4.mp3",
    ],
  },
  water: {
    files: [
      "assets/water/bubble.mp3",
      "assets/water/crash.mp3",
      "assets/water/drip.mp3",
      "assets/water/flow.mp3",
      "assets/water/ocean.mp3",
      "assets/water/plop.mp3",
      "assets/water/splash.mp3",
      "assets/water/wave.mp3",
    ],
  },
};

// samples =  loaded sounds
let samples = [];
let kits;

// load sounds and put in samples array with sound objects
function drumbit_preload() {
  kits = {};
  for (let k in sound_files) {
    const samples = [];
    for (let file of sound_files[k].files) {
      const sample = loadSound(file);
      // With untilDone, a sound will play only if it's not already playing.
      sample.playMode("untilDone");
      samples.push(sample);
    }
    kits[k] = {};
    kits[k].samples = samples;
  }
}

class Drumbit {
  constructor(w, h) {
    this.width = w;
    this.height = h;
    this.img = null;
    this.timeSinceQuarterStart = 0;

    // this.padWidth = (w - (DB_COLS + 1) * DB_PAD_SPACING) / DB_COLS;
    // this.padHeight = (h - (DB_ROWS + 1) * DB_PAD_SPACING) / DB_ROWS;
    // this.padRadius =
    //   (min(this.padWidth, this.padHeight) * DB_PAD_RADIUS_PCT) / 100;
    this.pads = [];
    for (let i = 0; i < DB_ROWS; i++) {
      this.pads.push([]);
      for (let j = 0; j < DB_COLS; j++) {
        this.pads[i].push({ state: "off", manual: false });
      }
    }
  }

  setup(soundKitName) {
    this.resize(this.width, this.height);
    this.soundKit(soundKitName);

    // record the time of start
    this.millis = millis();
    this.state = "stopped";
    this.activeColumn = DB_COLS;
    this.beatStartTime = millis();
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this.img = createGraphics(this.width, this.height, P2D);
    this.img.pixelDensity(screen_pixel_density);

    this.padWidth = (w - (DB_COLS + 1) * DB_PAD_SPACING) / DB_COLS;
    this.padHeight = (h - (DB_ROWS + 1) * DB_PAD_SPACING) / DB_ROWS;
    this.padRadius =
      (min(this.padWidth, this.padHeight) * DB_PAD_RADIUS_PCT) / 100;
  }

  randomize() {
    for (let i = 0; i < DB_ROWS; i++) {
      for (let j = 0; j < DB_COLS; j++) {
        this.pads[i][j].state = random() < DB_MIN_FILL_PCT / 100 ? "on" : "off";
        this.pads[i][j].manual = true;
      }
    }
  }

  render(what) {
    let g = this.img;

    g.clear();

    if (what.background) {
      g.rectMode(CORNER);
      g.noStroke();

      // draw the background of the pad area
      g.fill("#01200F");
      g.rect(0, 0, this.width, this.height);
    }

    if (what.outlines) {
      g.strokeWeight(1);
    } else {
      g.noStroke();
    }

    if (!what.pads) {
      g.noFill();
    }

    if (what.outlines || what.pads) {
      // draw each pad
      g.ellipseMode(CORNER);
      g.rectMode(CORNER);
      for (let i = 0; i < DB_ROWS; i++) {
        for (let j = 0; j < DB_COLS; j++) {
          let x = DB_PAD_SPACING + j * (this.padWidth + DB_PAD_SPACING);
          let y = DB_PAD_SPACING + i * (this.padHeight + DB_PAD_SPACING);
          let pad = this.pads[i][j];

          if (what.pads) {
            g.fill(pad.state === "on" ? "#F95738" : "#261447");
          }

          if (what.outlines) {
            g.stroke(j % 4 === 0 ? "#B0A3D4" : "#7D80DA");
          }
          if (params.drumbit.circular_pads) {
            g.ellipse(x, y, this.padWidth, this.padHeight);
          } else {
            g.rect(x, y, this.padWidth, this.padHeight, this.padRadius);
          }
        }
      }
    }

    if (what.beatline && this.state == "running") {
      //draw the moving position marker line
      let timeSinceBeatStart = millis() - this.beatStartTime;
      let x = map(timeSinceBeatStart, 0, this.beatDuration(), 0, this.width);
      x = x % this.width;
      if (millis() - this.timeSinceQuarterStart < 40) {
        g.stroke(0, 255, 255, 224);
        g.strokeWeight(2);
        this.quarter = false;
      } else {
        g.stroke(180, 0, 0, 224);
        g.strokeWeight(1);
      }
      g.line(x, 0, x, this.height);
    }
  }

  beatDuration() {
    return 1000 * (60.0 / BPM) * 4;
  }
  padDuration() {
    return this.beatDuration() / DB_COLS;
  }

  onBeat(callback) {
    this.beatCallback = callback;
  }

  update() {
    if (this.state === "running") {
      //play sounds for the current column

      let timeSinceBeatStart = millis() - this.beatStartTime;
      let currentColumn =
        int(timeSinceBeatStart / this.padDuration()) % DB_COLS;

      if (currentColumn != this.activeColumn) {
        this.activeColumn = currentColumn;
        for (let i = 0; i < DB_ROWS; i++) {
          if (this.pads[i][currentColumn].state === "on") {
            this.samples[i].play();
          }
        }

        if (this.activeColumn % 4 == 0) {
          this.timeSinceQuarterStart = millis();
        }
        this.beatCallback(this.activeColumn);
      }
    }
  }

  // check the minimap and update activations of the pads based on it
  activatePads(mini) {
    if (mini.length != DB_ROWS * DB_COLS * 4) {
      console.log(`error: minimap is not usable: length= ${mini.length}`);
      return;
    }

    let sorted = [];
    for (var i = 0; i < DB_ROWS; i++) {
      for (var j = 0; j < DB_COLS; j++) {
        let base = 4 * (i * DB_COLS + j);
        sorted.push({
          row: i,
          col: j,
          r: mini[base],
          g: mini[base + 1],
          b: mini[base + 2],
        });
      }
    }

    sorted.sort((p, q) => {
      return -(p.r + p.g + p.b - q.r - q.g - q.b);
    });

    let numOn = 0;
    for (var i = 0; i < DB_ROWS; i++) {
      for (var j = 0; j < DB_COLS; j++) {
        let pad = this.pads[i][j];
        if (!pad.manual) {
          pad.state = "off";
        } else {
          if (pad.state === "on") numOn += 1;
        }
      }
    }

    let fillPct = random(DB_MIN_FILL_PCT, DB_MAX_FILL_PCT);
    let count = int((DB_ROWS * DB_COLS * fillPct) / 100);

    for (let k = 0; k < sorted.length && numOn < count; k++) {
      let pad = this.pads[sorted[k].row][sorted[k].col];
      if (pad.manual) continue;
      pad.state = "on";
      numOn += 1;
    }
  }

  mousePressed(m) {
    let r = int(
      constrain(m.y / (this.padHeight + DB_PAD_SPACING), 0, DB_ROWS - 1)
    );
    let c = int(
      constrain(m.x / (this.padWidth + DB_PAD_SPACING), 0, DB_COLS - 1)
    );
    let pad = this.pads[r][c];
    pad.manual = true;
    if (pad.state === "on") {
      pad.state = "off";
    } else {
      pad.state = "on";
    }
    console.log(pad.state, r, c)
  }

  soundKit(name) {
    this.soundKitName = name;
    if (this.samples) {
      for (let sample of this.samples) {
        sample.stop();
      }
    }
    this.samples = kits[name].samples;
  }

  start() {
    if (this.state === "running") {
      // nothing to do, already running
      return;
    }

    this.state = "running";
    this.beatStartTime = millis();
    this.activeColumn = DB_COLS;
  }

  pause() {
    // not implemented
  }

  stop() {
    this.state = "stopped";
    for (let i = 0; i < DB_ROWS; i++) {
      this.samples[i].stop();
    }
  }

  reset() {
    for (let i = 0; i < DB_ROWS; i++) {
      for (let j = 0; j < DB_COLS; j++) {
        this.pads[i][j].state = "off";
      }
    }
  }
}
