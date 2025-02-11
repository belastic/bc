// noprotect
"use strict";

//
// This code is adapted from: https://openprocessing.org/sketch/2301607/
//
// The implementation is based on Karl Sims's Reaction-Diffusion Tutorial:
// https://www.karlsims.com/rd.html
//
// I am using the Laplacian kernel from Karl Sims's tutorial;
// 
// Alternative implementation is based on Wikipedia:
// Discrete Laplace operator: https://en.wikipedia.org/wiki/Discrete_Laplace_operator
// use laplacianS for the wikipedia version, instead of laplacian_ks
//
// from Wikipedia:         from tutorial:
//   [ .25,  .5, .25 ]       [ .05,  .2, .05 ]
//   [  .5, -3.,  .5 ]       [  .2, -1.,  .2 ]
//   [ .25,  .5, .25 ]       [ .05,  .2, .05 ]
//
// To set the center to -1, I divided by 3 on line 50 in shader.js.

const laplacian_karl_sims = `
vec2 laplacian_ks(vec2 uv, sampler2D tex, vec2 texelSize) {
  vec2 sum = vec2(0.);
  sum += .15*texture(tex, uv+vec2(-1., -1.)*texelSize).xy;
  sum +=  .6*texture(tex, uv+vec2(-1.,  0.)*texelSize).xy;
  sum += .15*texture(tex, uv+vec2(-1.,  1.)*texelSize).xy;
  sum +=  .6*texture(tex, uv+vec2( 0., -1.)*texelSize).xy;
  sum += -3.*texture(tex, uv+vec2( 0.,  0.)*texelSize).xy;
  sum +=  .6*texture(tex, uv+vec2( 0.,  1.)*texelSize).xy;
  sum += .15*texture(tex, uv+vec2( 1., -1.)*texelSize).xy;
  sum +=  .6*texture(tex, uv+vec2( 1.,  0.)*texelSize).xy;
  sum += .15*texture(tex, uv+vec2( 1.,  1.)*texelSize).xy;
  return sum;
}

vec2 laplacian_ks_wrap(vec2 uv, sampler2D tex, vec2 texelSize) {
  vec2 sum = vec2(0.);
  sum += .15*texture(tex, fract(uv+vec2(-1., -1.)*texelSize)).xy;
  sum +=  .6*texture(tex, fract(uv+vec2(-1.,  0.)*texelSize)).xy;
  sum += .15*texture(tex, fract(uv+vec2(-1.,  1.)*texelSize)).xy;
  sum +=  .6*texture(tex, fract(uv+vec2( 0., -1.)*texelSize)).xy;
  sum += -3.*texture(tex, fract(uv+vec2( 0.,  0.)*texelSize)).xy;
  sum +=  .6*texture(tex, fract(uv+vec2( 0.,  1.)*texelSize)).xy;
  sum += .15*texture(tex, fract(uv+vec2( 1., -1.)*texelSize)).xy;
  sum +=  .6*texture(tex, fract(uv+vec2( 1.,  0.)*texelSize)).xy;
  sum += .15*texture(tex, fract(uv+vec2( 1.,  1.)*texelSize)).xy;
  return sum;
}
`

const diffusion_shader = `#version 300 es
	#define RED   vec4(1., 0., 0., 1.)
	#define GREEN vec4(0., 1., 0., 1.)
    #define LAP laplacian_ks
    #define LAPW laplacian_ks_wrap

	precision highp float;

	uniform sampler2D u_src;
	uniform vec2 u_canvasSize;
	uniform vec2 u_texelSize;
	uniform vec2 u_mouse;
	uniform float u_feed;
	uniform float u_kill;
	uniform float u_dt;
	uniform float u_scale;
	uniform float u_radius;
	uniform bool u_wrap;
	uniform bool u_cursor;
	uniform bool u_clear;

	${shox_laplacian}
    ${laplacian_karl_sims}

	float circle(vec2 uv, vec2 pos, float r) {
		float f = max(u_canvasSize.x, u_canvasSize.y)/min(u_canvasSize.x, u_canvasSize.y);
		vec2 sFac = (u_canvasSize.x > u_canvasSize.y) ? vec2(f, 1.) : vec2(1., f);
		float e = 2./u_canvasSize.x;
		return smoothstep(-e, e, length(uv*sFac-pos*sFac)-r);
	}

	in vec2 vTexCoord;
	out vec4 fragColor;
	void main() {
		if (u_clear) { fragColor = RED; return; }

		vec2 uv = vTexCoord;
		uv.y = 1.-uv.y;

		/////////////////////////////////////////////
		// Reaction-Diffusion ///////////////////////

		vec2 AB = texture(u_src, uv).rg;
		float A = AB.r;
		float B = AB.g;
		float reaction = A*B*B;

		vec2 LAB = u_wrap ? LAPW(uv, u_src, u_texelSize) : LAP(uv, u_src, u_texelSize);
		LAB /= 3.;
		float LA = LAB.x;
		float LB = LAB.y;

		float DA = 1./u_scale/2.;
		float DB = .5/u_scale/2.;

		float newA = A+(DA*LA-reaction+u_feed*(1.-A))*u_dt;
		float newB = B+(DB*LB+reaction-(u_kill+u_feed)*B)*u_dt;

		fragColor = vec4(newA, newB, 0., 1.);

		/////////////////////////////////////////////
		// Mouse Interaction ////////////////////////
        vec2 pos = u_mouse;
        pos.y = 1.-pos.y;
            
		float cursor = u_cursor ? circle(uv, pos, u_radius) : 1.;
		fragColor = mix(GREEN, fragColor, cursor);
	}
`

const display_shader = `#version 300 es
precision mediump float;

uniform sampler2D u_src;
uniform vec2 u_canvasSize;
uniform vec2 u_texelSize;
uniform float u_pixel_size;
uniform float u_pixel_radius;
uniform bool u_pixelate;
uniform bool u_wrap;
uniform vec3 u_brightness;
uniform vec3 u_contrast;
uniform vec3 u_frequency;
uniform vec3 u_phase;
uniform bool u_emboss;
uniform float u_offset;

${shox_iqPalette}
${shox_emboss}

in vec2 vTexCoord;
out vec4 fragColor;
void main() {
    
  vec2 resolution = vec2(textureSize(u_src, 0));
  vec2 uv = vTexCoord;
  vec2 ab = texture(u_src, uv).rg;
  float alpha = 1.;

  if (u_pixelate) {
    // pixelation
    vec2 xy = uv * resolution; // (0.252, 0.33) * (1000, 300) = (252, 99)
    vec2 gridxy = floor(xy / u_pixel_size) * u_pixel_size + u_pixel_size / 2.;
        
    vec2 griduv = gridxy / resolution;
    vec4 gridColor = texture(u_src, griduv);
    float wiggler = 0.5*(1.+sin(ab.r));
    float dist = length(xy - gridxy);
             wiggler = 1.;
    float radius = 0.5 * u_pixel_size * u_pixel_radius * wiggler;
    float edge = 1.;
    alpha = smoothstep(radius+edge/2., radius - edge/2., dist);
    // ignore above and set alpha to 1, to make square pixels
    // alpha = 1.;
    uv = griduv;
  }

  float chemical = u_emboss
    ? u_wrap
      ? emboss2VWrap(uv, u_src, u_texelSize, 1.).r
      : emboss2V    (uv, u_src, u_texelSize, 1.).r
    : texture(u_src, uv).r;
  chemical += u_offset;
  vec4 color = vec4(palette(chemical, u_brightness, u_contrast, u_frequency, u_phase ), 1.);
  fragColor = mix(vec4(0.), color, alpha);

  // uncomment to show the raw reaction chemicals on screen
  // fragColor = texture(u_src, uv);
}
`

const refraction_shader = `#version 300 es
precision mediump float;

uniform sampler2D u_src;  // Tiles texture
uniform sampler2D u_glass;  // Waves (displacement map) texture
uniform float u_strength;
uniform float u_zoom;

in vec2 vTexCoord;
out vec4 fragColor;

void main() {
  // Scale the waves texture coordinates for animation
  vec2 glassUV = vTexCoord;
  glassUV.y = 1.-glassUV.y;
  
  // Sample the waves texture
  vec4 glass = texture(u_glass, glassUV/u_zoom);
  vec2 displacement = glass.a * (glass.rg);
  
  // Adjust UV coordinates of the tiles based on displacement
  vec2 displacedUV = uv + displacement * u_strength; // Offset UV coordinates
  
  // Sample the tiles texture with displaced UVs
  vec4 color = texture(u_src, displacedUV);
  
  fragColor = color; // Set the final pixel color
}
`
const refraction_shader2 = `#version 300 es
precision mediump float;

uniform sampler2D u_src;  // Tiles texture
uniform sampler2D u_glass;  // Waves (displacement map) texture
uniform float u_strength;
uniform float u_zoom;
uniform vec2 u_top_left;
uniform vec2 u_size;

in vec2 vTexCoord;
out vec4 fragColor;

void main() {
  vec2 uv = vTexCoord;
  uv.y = 1. - uv.y;
  // Scale the waves texture coordinates for animation
  vec2 glassUV = mix(u_top_left, u_top_left+u_size, uv)/vec2(textureSize(u_glass, 0))/u_zoom;
  
  // Sample the waves texture
  vec4 glass = texture(u_glass, glassUV);
  
  // Compute average brightness to center the values
  float avg = (glass.r + glass.g + glass.b) / 3.0;
  float r = glass.r - avg;
  float g = glass.g - avg;
  float b = glass.b - avg;

  // Symmetric displacement using weighted contributions
  float dx = r * cos(0.0) + g * cos(2.0 * 3.14159 / 3.0) + b * cos(4.0 * 3.14159 / 3.0);
  float dy = r * sin(0.0) + g * sin(2.0 * 3.14159 / 3.0) + b * sin(4.0 * 3.14159 / 3.0);

  // Output displacement vector
  vec2 displacement = vec2(dx, dy) + avg;
  displacement.y = displacement.y * 2.; // hack for aspect ratio
  
  // Adjust UV coordinates of the tiles based on displacement
  vec2 displacedUV = uv + displacement * u_strength; // Offset UV coordinates
  
  // Sample the tiles texture with displaced UVs
  vec4 color = texture(u_src, displacedUV);
  
  fragColor = color; // Set the final pixel color
}
`
const vertex_shader = `#version 300 es
	in vec4 aPosition;
	in vec2 aTexCoord;

	out vec2 vTexCoord;

	void main() {
		vTexCoord = aTexCoord;
		gl_Position = aPosition;
	}
`
