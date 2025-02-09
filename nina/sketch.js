// I was inspired by the idea of concurrent scrolling. Footage is mostly
// original and some edited found footage from the Prelinger Archives. 

"use strict";
////////////////////////////////////////////////////////////////////////
// Tunables
let TILE_PADDING = 0; // transparent space between tiles
let MIN_SPLIT_RATIO = 0.25; // don't split too skewed
let MAX_SPLIT_RATIO = 0.75; // max skew in other direction
let MIN_DRIFT_SPEED = 0.5; // pct of width/height that should drift per sec
let MAX_DRIFT_SPEED = 3; // driftspeed randomized between min and max
let MIN_VID_PAN_SPEED = 6;
let MAX_VID_PAN_SPEED = 12;
let MIN_IMG_PAN_SPEED = 24;
let MAX_IMG_PAN_SPEED = 64;
let TILE_COEFFICIENT = 0.7; // bigger this number, more tiles it tries to make
let VIDEO_TILE_PCT = 50; // the pct of tiles that should be videos (vs images)
let DEBUG_TILE_BOUNDARY = false;
let RETILE_INTERVAL = 1.5; // retile every this many seconds

let imageDisplayTime = 1000;
let isDisplayingImage = false;
let imageDisplayStart = 0;

let assetBaseUrl = "assets/";
let videoFiles = [
  "ppl.webm",
  "tree.webm",
  "leaf.webm",
  "purp.webm",
  "pad.webm",
  "glo.webm",
  "pixel.webm",
  "circle.webm",
];

let imageFiles = ["pan1.png", "pan2.png", "pan3.png", "pan4.png"];
let cutoutFiles = ["cut1.png", "cut2.png", "cut3.png"];

let cymbalTimes = [24050, 134000];

let scissorsVid = null;
let grainImg = null;
let previewImg = null;
let kickImg;
let song;
let fft;
let videos = [];
let images = [];
let cutoutImages = [];
let nextVideoIndex = 0;
let nextImageIndex = 0;
let nextCutoutIndex = 0;

let tiling;
let glitter;

let kickDetected = false; // Flag for detecting drum kicks
let kickResetTimer = 0; // Timer for resetting the kick detection
let kickThreshold = 200; // Energy threshold for drum kicks

function loadVideos() {
  for (let f of videoFiles) {
    let vid = createVideo(assetBaseUrl + f);
    vid.hide();
    vid.volume(0);
    vid.autoplay(false);
    append(videos, vid);
  }
  shuffle(videos);

  scissorsVid = createVideo(assetBaseUrl + "scissors.webm");
  scissorsVid.hide();
  scissorsVid.volume(0);
}

function loadImages() {
  for (let f of imageFiles) {
    let img = loadImage(assetBaseUrl + f);
    append(images, img);
  }
  for (let f of cutoutFiles) {
    let img = loadImage(assetBaseUrl + f);
    append(cutoutImages, img);
  }
  kickImg = loadImage(assetBaseUrl + "buzz.png");
  grainImg = loadImage(assetBaseUrl + "glass2-min.jpg");
  previewImg = loadImage(assetBaseUrl + "preview.jpg");
}

function loadSong() {
  song = loadSound(assetBaseUrl + "nina.mp3");
}

function preload() {
  loadVideos();
  loadImages();
  loadSong();
}

let lastDrawMs = 0;

class Tiling {
  constructor(level) {
    this.x = 0;
    this.y = 0;
    this.w = 0;
    this.h = 0;
    this.l = level;
    this.media = null;
    this.panX = 0;
    this.panY = 0;
    this.panSpeed = 0;

    this.driftSpeed = 0;
    this.driftGoal = 0;
    this.splitPoint = 0;
    this.scrollSpeed = 0;
    this.children = null;

    let subdivide = random() > 1 - pow(TILE_COEFFICIENT, level);
    if (subdivide) {
      this.children = [];
      append(this.children, new Tiling(level + 1));
      append(this.children, new Tiling(level + 1));
    } else {
      // nothing to do here. we are done.
      this.children = null;
    }
  }

  assignMedia() {
    if (this.children == null) {
      // this is a tile that is not subdivided. select media for it
      if (random(100) < VIDEO_TILE_PCT) {
        this.media = videos[nextVideoIndex];
        nextVideoIndex = (nextVideoIndex + 1) % videos.length;
      } else {
        this.media = images[nextImageIndex];
        nextImageIndex = (nextImageIndex + 1) % images.length;
      }
    } else {
      for (let child of this.children) {
        child.assignMedia();
      }
    }
  }

  display() {
    if (this.children == null) {
      // just display the media
      if (this.media != null && this.media.width != 0) {
        let scaleX = this.media.width / this.w;
        let scaleY = this.media.height / this.h;
        let scale = min(scaleX, scaleY);
        image(
          this.media,
          this.x,
          this.y,
          this.w,
          this.h,
          this.panX * scale,
          this.panY * scale,
          this.w * scale,
          this.h * scale
        );

        if (DEBUG_TILE_BOUNDARY) {
          stroke(255);
          noFill();
          rect(this.x, this.y, this.w, this.h);
        }
      } else {
        stroke(255);
        fill(128, 0, 0);
        rect(this.x, this.y, this.w, this.h);
      }
    } else {
      for (let child of this.children) {
        child.display();
      }
    }
  }

  update(x, y, w, h, deltaMs) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;

    if (this.children == null) {
      // handle scroll
      if (this.panSpeed == 0 && this.panX == 0 && this.panY == 0) {
        // initialize the pan speed
        if (this.media instanceof p5.Image) {
          this.panSpeed = random(MIN_IMG_PAN_SPEED, MAX_IMG_PAN_SPEED) / 100;
        } else {
          this.panSpeed = random(MIN_VID_PAN_SPEED, MAX_VID_PAN_SPEED) / 100;
        }
      }
      // figure out how much to scale the media
      let tileAspect = this.w / this.h;
      let imgAspect = this.media.width / this.media.height;

      let shift = (min(this.w, this.h) * this.panSpeed * deltaMs) / 1000;
      if (imgAspect > tileAspect) {
        // image is wider than tile, we are panning horizontally
        let scaledSide = (this.media.width / this.media.height) * this.h;
        this.panX += shift;
        if (this.panX < 0 || this.panX + this.w > scaledSide) {
          this.panSpeed *= -1;
          this.panX = constrain(this.panX, 0, scaledSide - this.w);
        }
        this.panY = 0;
      } else {
        // image is taller than tile, we are panning vertically
        let scaledSide = (this.media.height / this.media.width) * this.w;
        this.panY += shift;
        if (this.panY < 0 || this.panY + this.h > scaledSide) {
          this.panSpeed *= -1;
          this.panY = constrain(this.panY, 0, scaledSide - this.h);
        }
        this.panX = 0;
      }
    } else {
      // handle splits
      let bigSide = w > h ? w : h;

      if (this.driftSpeed == 0 && this.driftGoal == 0 && this.splitPoint == 0) {
        // initialize speed and goal
        let ratio = random(MIN_SPLIT_RATIO, MAX_SPLIT_RATIO);
        this.splitPoint = (bigSide - TILE_PADDING) * ratio;
        this.driftSpeed = random(MIN_DRIFT_SPEED, MAX_DRIFT_SPEED) / 100;
        if (random() < 0.5) {
          this.driftGoal = bigSide * MIN_SPLIT_RATIO;
          this.driftSpeed *= -1;
        } else {
          this.driftGoal = bigSide * MAX_SPLIT_RATIO;
        }
      }

      this.splitPoint = constrain(
        this.splitPoint,
        bigSide * MIN_SPLIT_RATIO,
        bigSide * MAX_SPLIT_RATIO
      );
      this.driftGoal = constrain(
        this.driftGoal,
        bigSide * MIN_SPLIT_RATIO,
        bigSide * MAX_SPLIT_RATIO
      );

      let shift = (bigSide * this.driftSpeed * deltaMs) / 1000;
      this.splitPoint += shift;
      if (this.driftSpeed > 0 && this.splitPoint > this.driftGoal) {
        this.driftSpeed *= -1;
        this.driftGoal = bigSide * MIN_SPLIT_RATIO;
      } else if (this.driftSpeed < 0 && this.splitPoint < this.driftGoal) {
        this.driftSpeed *= -1;
        this.driftGoal = bigSide * MAX_SPLIT_RATIO;
      }

      if (w > h) {
        this.children[0].update(this.x, this.y, this.splitPoint, h, deltaMs);
        this.children[1].update(
          this.x + this.splitPoint + TILE_PADDING,
          this.y,
          this.w - this.splitPoint - TILE_PADDING,
          h,
          deltaMs
        );
      } else {
        this.children[0].update(
          this.x,
          this.y,
          this.w,
          this.splitPoint,
          deltaMs
        );
        this.children[1].update(
          this.x,
          this.y + this.splitPoint + TILE_PADDING,
          this.w,
          h - this.splitPoint - TILE_PADDING,
          deltaMs
        );
      }
    }
  }
}


function kickDetect() {
  // Analyze the frequency spectrum
  let spectrum = fft.analyze();

  // Get the energy in the low-frequency range (drum kicks)
  let kickEnergy = fft.getEnergy(10, 40);

  // Check if the kickEnergy exceeds the threshold and the timer allows detection
  if (kickEnergy > kickThreshold && !kickDetected) {
    kickDetected = true; // Mark the kick as detected
    kickResetTimer = millis(); // Record the time of the kick

    // Display the image at a random position
   // let x = random(width - 100);
    let y = random(height - 100);
   image(kickImg, width -600, y, random(500), random(500));
    // fill(255, 255, 255, 192);
    // circle(x, y, 100);
  }

  // Reset kick detection after a short delay (e.g., 200 ms)
  if (kickDetected && millis() - kickResetTimer > 300) {
    kickDetected = false;
  }
}

function displaySpectrum() {
  let spectrum = fft.analyze();

  noStroke();
  fill(0, 255, 0);

  for (let i = 0; i < spectrum.length; i++) {
    let x1 = map(i, 0, spectrum.length, width / 2, 0);
    let x2 = map(i, 0, spectrum.length, width / 2, width);
    let h = map(spectrum[i], 0, 255, 0, height / 4);
    rect(x1, height - h, width / spectrum.length, h);
    rect(x2, height - h, width / spectrum.length, h);
  }
}

function reTile() {
  tiling = new Tiling(0, 0, width, height, 0);
  tiling.assignMedia();
}

let cymbalImage = null;
let cymbalImageStartMs = 0;

function processCymbal() {
  if (cymbalImage == null) {
    shuffle(cutoutImages);
    nextCutoutIndex = 0;
  }

  cymbalImage = cutoutImages[nextCutoutIndex];
  nextCutoutIndex = (nextCutoutIndex + 1) % cutoutImages.length;

  cymbalImageStartMs = millis();
}

function displayCymbalImage() {
  if (cymbalImage == null) return;

  // draw the image
  let scale = height / cymbalImage.height;
  imageMode(CENTER);
  image(
    cymbalImage,
    width / 2,
    height / 2,
    cymbalImage.width * scale,
    cymbalImage.height * scale
  );
  imageMode(CORNER);

  let curMs = millis();
  let interCymbalMs = 337;
  if (curMs - cymbalImageStartMs > interCymbalMs) {
    if (nextCutoutIndex == cutoutImages.length) {
      // we are done
      nextCutoutIndex = 0;
      cymbalImage = null;
    } else {
      cymbalImage = cutoutImages[nextCutoutIndex];
      nextCutoutIndex += 1;
      cymbalImageStartMs = curMs;
    }
  }
}

let playButton;
let buttonSize;
let playing = false;
let startTimeMs = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  buttonSize = height * .06;
  playButton = new PlayButton(width / 2, height / 2, buttonSize);
  noLoop();
}

function startPlaying() {
  shuffle(videos);
  shuffle(images);
  shuffle(cutoutImages);

  reTile();

  song.play();
  scissorsVid.play();
  for (let vid of videos) {
    vid.loop();
    print(vid);
  }

  fft = new p5.FFT();
  setInterval(reTile, RETILE_INTERVAL * 1000);

  for (let t of cymbalTimes) {
    setTimeout(processCymbal, t);
  }
  loop();
  startTimeMs = millis();
  playing = true;
}

function draw() {
  background(0, 0, 0);
  if (!playing) {
    push();
    imageMode(CENTER);
    image(previewImg, width / 2, height / 2, width, height);
    playButton.display();
    pop();
    return;
  }

  rectMode(CORNER);
  imageMode(CORNER);

  let curMs = millis();

  tiling.update(0, 0, width, height, curMs - lastDrawMs);
  tiling.display();

  if (
    scissorsVid != null &&
    scissorsVid.width != 0 &&
    scissorsVid.duration() * 1000 > curMs - startTimeMs
  ) {
    imageMode(CENTER);
    blendMode(EXCLUSION);
    let s = height / scissorsVid.height;
    image(scissorsVid, width / 2, height / 2, scissorsVid.width * s, height);
    blendMode(BLEND);
    imageMode(CORNER);
  }

  displayCymbalImage();

  kickDetect();

  // add overlay for texture.  png
  if (grainImg != null) {
    push();
    let s1 = width / grainImg.width;
    let s2 = height / grainImg.height;
    let s = max(s1, s2);
    blendMode(OVERLAY);
    tint(255, 60);
    image(grainImg, 0, 0, grainImg.width * s, grainImg.height * s);
    pop();
  }
  lastDrawMs = curMs;
}

class PlayButton {
  constructor(x, y, size) {
    this.x = x;
    this.y = y;
    this.size = size;
  }

  display() {
    fill(72, 72, 72, 144);
    noStroke();
    ellipse(this.x, this.y, this.size * 2);
    fill(240);
    triangle(
      this.x - this.size / 4, this.y - this.size / 2.0,
      this.x - this.size / 4, this.y + this.size / 2.0,
      this.x + this.size / 2, this.y
    );
  }

  contains(px, py) {
    return dist(px, py, this.x, this.y) < this.size;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function mousePressed() {
  if (!playing && playButton.contains(mouseX, mouseY)) {
    startPlaying();
  }
}
