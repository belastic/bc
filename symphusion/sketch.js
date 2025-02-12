"use strict";

// refraction strength controls the multiplier for the refraction effect.
const REFRACTION_STRENGTH = 0.0025;

// tried different numbers, but this doesnt work for anything other than 1
const PIXEL_DENSITY = 1;

// the space around the drumbit
const DB_PADDING = 50;

// number of rows and columns of pads in the drumbit
const DB_ROWS = 8;
const DB_COLS = 16;

let diffusion;
let drumbit;
let refractor; // refraction shader
let message;

// for saving the original pixel density and using it for 2d graphics
let screen_pixel_density;

// grain overlay images.  screen.jpg has tint built in, screen-gray is 
// grayscale only
let screenImg;
let screenFile = "assets/screen.jpg"; // or use screen-gray.jpg

function preload() {
  drumbit_preload();
  screenImg = loadImage(screenFile);
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  // save the original pixel density, and set the main canvas density to 1.
  screen_pixel_density = pixelDensity();
  pixelDensity(PIXEL_DENSITY);

  refractor = createShader(vertex_shader, refraction_shader2);

  // compute dimensions for the drumbit and diffusion
  let dims = computeDimensions();
  drumbit = new Drumbit(dims[1].x, dims[1].y);
  drumbit.setup(params.drumbit.sound_kit);
  drumbit.onBeat(handleBeat);
  drumbit.start();

  diffusion = new Diffusion(dims[0].x, dims[0].y);

  message = new FadingMessage();

  // start out with the pane hidden
  pane.hidden = true;

  message.flash("Ctrl+Shift+H for control panel", 5000);
}

function draw() {
  background(0);
  // orbit controls are cool, but they interfere with the mouse interaction
  // orbitControl();
  
  // change mouse coordinates to be relative to the diffusion rectangle
  // so the diffusion class can handle painting the mouse
  let topleft = createVector(
    (width - diffusion.width) / 2,
    (height - diffusion.height) / 2
  );
  let m = createVector(mouseX, mouseY).sub(topleft);

  // update each component - diffusion and drumbit
  diffusion.update(m);
  drumbit.update();

  // render each component to their off-screen buffers
  // only render some subcomponents of the drumbit here
  diffusion.render();
  drumbit.render({ pads: true, background: false });

  // use imageMode CENTER because WEBGL coordinate system has 0, 0 at center
  imageMode(CENTER);

  // draw the diffusion image, and paint the drumbit on top of it
  image(diffusion.img, 0, 0, diffusion.width, diffusion.height);
  let img = drumbit.img;
  if (params.refraction && params.refraction >= 0.01) {
    // if refraction is desired, refract the image
    img = refract(drumbit.img, diffusion.img);
  }
  image(img, 0, 0, drumbit.width, drumbit.height);

  // draw a zoomed in version of the diffusion on top the drumbit, but with high transparency
  tint(255, 96);
  image(
    diffusion.img,
    0,
    0,
    drumbit.width,
    drumbit.height,
    DB_PADDING / params.zoom,
    DB_PADDING / params.zoom,
    drumbit.width / params.zoom,
    drumbit.height / params.zoom
  );

  // WARNING: noTint has a bug and does not work.  Use this instead
  tint(255, 255);

  // draw the drumbit outlines on top, so outlines never look faded
  drumbit.render({ outlines: true, beatline: true });
  params.fps = frameRate();

  img = drumbit.img;
  if (params.refraction && params.refraction >= 0.01) {
    // if refraction is desired, refract the image
    img = refract(drumbit.img, diffusion.img);
  }

  image(img, 0, 0, drumbit.width, drumbit.height);

  // add gritty screen effect to the screen
  if (params.render.screen_grain) {
    drawGrain(screenImg);
  }

  // finally, draw the message
  message.draw();
}

// shader based refraction. it takes a source image to distort according
// to the refraction, and a 'glass' image - to use as refraction input
let refracted_img; // special framebuffer for refraction
function refract(src, glass) {
  if (!params.refraction || params.refraction < 0.01) {
    // no need to refract, just return the source
    return src;
  }

  // if we didn't already make a buffer for it, do it now.
  if (!refracted_img) {
    refracted_img = createFramebuffer({
      format: FLOAT,
      textureFiltering: LINEAR,
      width: src.width,
      height: src.height,
      depth: false,
    });
  }

  // setup shader parameters; the shader does all the work.
  refracted_img.begin();
  clear();
  shader(refractor);
  refractor.setUniform("u_src", src);
  refractor.setUniform("u_glass", glass);
  refractor.setUniform("u_strength", params.refraction * REFRACTION_STRENGTH);
  refractor.setUniform("u_zoom", params.zoom);
  refractor.setUniform("u_top_left", [DB_PADDING, DB_PADDING]);
  refractor.setUniform("u_size", [drumbit.width, drumbit.height]);
  quad(-1, 1, 1, 1, 1, -1, -1, -1);
  refracted_img.end();
  return refracted_img;
}

// called when the beat (16th) changes.
function handleBeat(beatNum) {
  // update the pad activations on every 4th beat
  if (beatNum % 4 == 0) {
    let mini = diffusion.getMiniMap();
    mini.loadPixels();
    drumbit.activatePads(mini.pixels);
  }
}

function drawGrain(img) {
  push();
  blendMode(MULTIPLY);
  tint(params.render.screen_tint);

  // Calculate aspect ratio-preserving dimensions
  let canvasAspect = width / height;
  let imgAspect = img.width / img.height;

  let drawWidth, drawHeight, scale;
  if (imgAspect > canvasAspect) {
    // Image is wider than canvas
    scale = img.height / height;
  } else {
    // Image is taller than canvas
    scale = img.width / width;
  }
  let sx, sy, sw, sh;
  sw = width * scale;
  sh = height * scale;
  sx = (img.width - sw) / 2;
  sy = (img.height - sh) / 2;
  image(img, 0, 0, width, height, sx, sy, sw, sh);
  pop();
}

class FadingMessage {
  constructor() {
    this.width = 300;
    this.height = 30;
    this.startTime = 0;
    this.img = createGraphics(this.width, this.height);
    this.img.pixelDensity(2);
  }
  flash(msg, duration = 1600) {
    this.msg = msg;
    this.startTime = millis();
    this.duration = duration;
    let g = this.img;
    g.clear();
    g.fill(64, 128);
    g.rect(0, 0, this.width, this.height, this.height / 2);
    g.textSize(16);
    g.textFont("Verdana");
    g.fill(255);
    g.textAlign(CENTER, CENTER);
    g.text(this.msg, this.width / 2, this.height / 2);
  }

  draw() {
    const dt = millis() - this.startTime;
    if (dt > this.duration || !this.msg) return;
    const alpha = map(dt, 0, this.duration, 255, 0);
    push();
    tint(255, alpha);
    imageMode(CENTER);
    image(this.img, 0, (this.height - height + 16) / 2);
    pop();
  }
}

// calculate dimensions for diffusion and drumbit
// diffusion is bigger and drumbit sits inside it
// we need to figure out if the canvas is too tall or too wide
// to accommodate the largest dimension of art we can show in the canvas
// it returns an array of two Vectors - [0] is the diffusion, [1] is drumbit
// each item of the array is a vector where x is the width and y is the height
function computeDimensions() {
  // calculate pad width 2 different ways to see which one will fit
  let px = (width - 2 * DB_PADDING) / DB_COLS;
  let py = (height - 2 * DB_PADDING) / DB_ROWS;
  let db_width, db_height;
  let rd_width, rd_height;
  if (px < py) {
    rd_width = width;
    rd_height =
      ((rd_width - 2 * DB_PADDING) * DB_ROWS) / DB_COLS + 2 * DB_PADDING;
  } else {
    rd_height = height;
    rd_width =
      ((rd_height - 2 * DB_PADDING) * DB_COLS) / DB_ROWS + 2 * DB_PADDING;
  }

  db_width = rd_width - 2 * DB_PADDING;
  db_height = rd_height - 2 * DB_PADDING;

  return [createVector(rd_width, rd_height), createVector(db_width, db_height)];
}

// key pressed
function keyPressed() {
  if (key == "H" && keyIsDown(CONTROL) && keyIsDown(SHIFT)) {
    // Ctrl+Shift+H to toggle tweak pane visibility
    pane.hidden = !pane.hidden;
  } else if (keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW) {
    // cycle through sound kits
    let i = 0;
    let kitNames = Object.keys(kits);

    // find the index of the sound kit from its name
    for (i = 0; i < kitNames.length; i++) {
      if (kitNames[i] === params.drumbit.sound_kit) break;
    }
    if (i == kitNames.length) {
      i = 0;
    } else {
      let delta = keyCode === LEFT_ARROW ? -1 : +1;
      i = (i + delta + kitNames.length) % kitNames.length;
    }
    params.drumbit.sound_kit = kitNames[i];
    drumbit.soundKit(kitNames[i]);
    message.flash(`Sound kit: ${kitNames[i]}`);
  } else if (keyCode === UP_ARROW || keyCode === DOWN_ARROW) {
    // cycle through presets
    let i = 0;
    let presetNames = Object.keys(presets);
    for (i == 0; i < presetNames.length; i++) {
      if (presetNames[i] === params.preset) break;
    }
    if (i == presetNames.length) {
      i = 0;
    } else {
      let delta = keyCode === DOWN_ARROW ? -1 : 1;
      i = (i + delta + presetNames.length) % presetNames.length;
    }
    params.preset = presetNames[i];
    setPreset(presetNames[i]);
    message.flash(`Preset: ${presetNames[i]}`);
  }
}

// the diffusion handles its own mouse interaction in the shader
// this function handles clicks that interact with the drumbit
function mousePressed() {
  // if the mouse is not in the drumbit rectangle, ignore
  let x = (width - drumbit.width) / 2;
  let y = (height - drumbit.height) / 2;
  if (
    mouseX < x ||
    mouseX >= x + drumbit.width ||
    mouseY < y ||
    mouseY >= y + drumbit.height
  ) {
    // console.log(`clicked outside active surface: ${mouseX} ${mouseY}`);
    return;
  }

  if (!keyIsDown(CONTROL)) {
    // we only handle clicks if CONTROL is held down
    return;
  }

  // translate mouse coordinates to drumbit
  let m = createVector(mouseX - x, mouseY - y);
  drumbit.mousePressed(m);
}

function windowResized() {
  console.log(`resized: ${windowWidth}x${windowHeight}`);

  resizeCanvas(windowWidth, windowHeight);
  let dims = computeDimensions();
  drumbit.resize(dims[1].x, dims[1].y);
  diffusion.resize(dims[0].x, dims[0].y);
}
