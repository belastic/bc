"use strict";

class Diffusion {
  constructor(w, h, density = 1) {
    this.width = w;
    this.height = h;
    this.density = density;

    // src and dst are two framebuffers where the reaction occurs
    this.src = createFramebuffer({
      format: FLOAT,
      textureFiltering: NEAREST,
      width: this.width * this.density,
      height: this.height * this.density,
      depth: false,
    });

    this.dst = createFramebuffer({
      format: FLOAT,
      textureFiltering: NEAREST,
      width: this.width * this.density,
      height: this.height * this.density,
      depth: false,
    });

    // img is the framebuffer where a displayable image of the reaction
    // is placed to be drawn on the canvas. we are drawing this offscreen
    // because we want to use it multiple times on the main canvas (with and without zoom)
    // the texture sampling is LINEAR here for smoother zoomed in display
    this.img = createFramebuffer({
      format: FLOAT,
      textureFiltering: LINEAR,
      width: this.width * this.density,
      height: this.height * this.density,
      depth: false,
    });

    // mini is a minimap - that shrinks the reaction to 1 pixel per drumpad
    this.mini = createFramebuffer({
      format: FLOAT,
      textureFiltering: LINEAR,
      width: DB_COLS,
      height: DB_ROWS,
      depth: false,
    });

    this.diffuser = createShader(vertex_shader, diffusion_shader);
    this.renderer = createShader(vertex_shader, display_shader);
  }

  // responds to window resize: we resize all our framebuffers - which clears the reaction as well
  resize(w, h) {
    this.width = w;
    this.height = h;
    this.src.resize(w * this.density, h * this.density);
    this.dst.resize(w * this.density, h * this.density);
    this.img.resize(w * this.density, h * this.density);
  }

  // update the reaction
  update(m) {
    // check if mouse is to be considered. if the mouse is pressed, and in our region
    // but no CONTROL is held down - it is for us; if CONTROL is held down - it is for
    // the drumbit
    let mouseAction =
      m.x >= 0 &&
      m.x < this.width &&
      m.y >= 0 &&
      m.y < this.height &&
      mouseIsPressed &&
      !keyIsDown(CONTROL);

    // on every update, we can do multiple steps of the reaction. this is
    // a parameter. in each step, the shader reads the current reaction from
    // the src, and writes new values into dst.  then we swap src and dst,
    // and the loop continues. final result is always in dst.
    for (let i = 0; i < params.iterations; i++) {
      [this.src, this.dst] = [this.dst, this.src];

      // setup shader parameters and invoke the shader
      this.dst.begin();
      shader(this.diffuser);
      this.diffuser.setUniform("u_src", this.src);
      this.diffuser.setUniform("u_canvasSize", [this.width, this.height]);
      this.diffuser.setUniform("u_texelSize", [
        1 / (this.width * this.density),
        1 / (this.height * this.density),
      ]);

      this.diffuser.setUniform("u_mouse", [
        m.x / this.width,
        m.y / this.height,
      ]);
      this.diffuser.setUniform("u_feed", params.feed);
      this.diffuser.setUniform("u_kill", params.kill);
      this.diffuser.setUniform("u_dt", params.dt);
      this.diffuser.setUniform("u_scale", params.scale);
      this.diffuser.setUniform("u_radius", params.radius);
      this.diffuser.setUniform("u_wrap", params.wrap);
      this.diffuser.setUniform("u_cursor", mouseAction);
      this.diffuser.setUniform("u_clear", params.clear);

      if (params.clear) params.clear = false;
      quad(-1, 1, 1, 1, 1, -1, -1, -1);
      this.dst.end();
    }
  }

  // calculate and return the mini map (pixel per drum pad)
  // we do this by scaling the reaction image down to 16x8 pixels.
  getMiniMap() {
    this.mini.begin();
    image(
      this.img, // use processed image instead of raw chemicals
      0,
      0,
      DB_COLS,
      DB_ROWS,
      0,
      0,
      this.dst.width / params.zoom,
      this.dst.height / params.zoom
    );
    this.mini.end();
    return this.mini;
  }

  render() {
    this.img.begin();
    clear();
    shader(this.renderer);
    this.renderer.setUniform("u_src", this.dst);
    this.renderer.setUniform("u_canvasSize", [this.width, this.height]);
    this.renderer.setUniform("u_texelSize", [
      1 / (this.width * this.density),
      1 / (this.height * this.density),
    ]);
    this.renderer.setUniform("u_wrap", params.wrap);
    this.renderer.setUniform(
      "u_brightness",
      xyz(params.render.palette.brightness)
    );
    this.renderer.setUniform("u_contrast", xyz(params.render.palette.contrast));
    this.renderer.setUniform(
      "u_frequency",
      xyz(params.render.palette.frequency)
    );
    this.renderer.setUniform("u_phase", xyz(params.render.palette.phase));
    this.renderer.setUniform("u_emboss", params.render.emboss);
    this.renderer.setUniform("u_offset", params.render.offset);
    
    let pixel_size = params.render.pixel_size * (1+0.05*sin(millis()/10000));
    this.renderer.setUniform("u_pixel_size", pixel_size);
    this.renderer.setUniform("u_pixel_radius", params.render.pixel_radius);
    this.renderer.setUniform("u_pixelate", params.render.pixelate);
    quad(-1, 1, 1, 1, 1, -1, -1, -1);
    this.img.end();
  }
}

function xyz(o) {
  return [o.x, o.y, o.z];
}
