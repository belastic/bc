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
uniform int u_pixelate; // 0 off, 1 square grid, 2 hexagonal grid, 3 ascii
uniform bool u_wrap;
uniform vec3 u_brightness;
uniform vec3 u_contrast;
uniform vec3 u_frequency;
uniform vec3 u_phase;
uniform bool u_emboss;
uniform float u_offset;

${shox_iqPalette}
${shox_emboss}

// see: https://www.redblobgames.com/grids/hexagons/
vec3 xy_to_cube(vec2 pos, float size) {
  float q = dot(vec2(sqrt(3.)/3., -1./3.), pos) / size;
  float r = 2./3. * pos.y / size;
    return vec3(q, r, -q-r);
}
vec3 cube_round(vec3 f) {
  vec3 n = round(f);
  vec3 d = abs(f - n);
  if (d.x > d.y && d.x > d.z)
    n.x = -n.y-n.z;
  else if (d.y > d.z) 
    n.y = -n.z-n.x;
  else
    n.z = -n.x-n.y;
  return n;
}
vec2 cube_to_xy(vec3 cube, float size) {
  float x = size * sqrt(3.) * dot(vec2(1., 0.5), cube.xy);
  float y = size * 3./2. * cube.y;
  return vec2(x, y);
}

// ascii shader from: https://www.shadertoy.com/view/lssGDj
// Bitmap to ASCII (not really) fragment shader by movAX13h, September 2013
// This is the original shader that is now used in PixiJs, FL Studio and various other products.
// Here's a little tool for new characters: thrill-project.com/archiv/coding/bitmap/
// update 2018-12-14: values for characters are integer now (were float)
//                    since bit operations are available now, making use of them
//                    instead of int(mod(n/exp2(p.x + 5.0*p.y), 2.0))
// update 2023-04-21: added characters A-Z and 0-9 and some others
//                    black/white mode does not use gray value anymore

float character(int n, vec2 p) {
  p = floor(p*vec2(-4.0, 4.0) + 2.5);
  if (clamp(p.x, 0.0, 4.0) == p.x) {
    if (clamp(p.y, 0.0, 4.0) == p.y) {
      int a = int(round(p.x) + 5.0 * round(p.y));
      if (((n >> a) & 1) == 1) return 1.0;
    }	
  }
  return 0.0;
}

vec4 charColor(vec2 pos, vec4 col) {
	float gray = 0.3 * col.r + 0.59 * col.g + 0.11 * col.b;
	    
	int n = 4096;
    
    // limited character set
    if (gray > 0.2) n = 65600;    // :
	if (gray > 0.3) n = 163153;   // *
	if (gray > 0.4) n = 15255086; // o 
	if (gray > 0.5) n = 13121101; // &
	if (gray > 0.6) n = 15252014; // 8
	if (gray > 0.7) n = 13195790; // @
	if (gray > 0.8) n = 11512810; // #
    
    // full character set including A-Z and 0-9
    /*
    if (gray > 0.0233) n = 4096;
    if (gray > 0.0465) n = 131200;
    if (gray > 0.0698) n = 4329476;
    if (gray > 0.0930) n = 459200;
    if (gray > 0.1163) n = 4591748;
    if (gray > 0.1395) n = 12652620;
    if (gray > 0.1628) n = 14749828;
    if (gray > 0.1860) n = 18393220;
    if (gray > 0.2093) n = 15239300;
    if (gray > 0.2326) n = 17318431;
    if (gray > 0.2558) n = 32641156;
    if (gray > 0.2791) n = 18393412;
    if (gray > 0.3023) n = 18157905;
    if (gray > 0.3256) n = 17463428;
    if (gray > 0.3488) n = 14954572;
    if (gray > 0.3721) n = 13177118;
    if (gray > 0.3953) n = 6566222;
    if (gray > 0.4186) n = 16269839;
    if (gray > 0.4419) n = 18444881;
    if (gray > 0.4651) n = 18400814;
    if (gray > 0.4884) n = 33061392;
    if (gray > 0.5116) n = 15255086;
    if (gray > 0.5349) n = 32045584;
    if (gray > 0.5581) n = 18405034;
    if (gray > 0.5814) n = 15022158;
    if (gray > 0.6047) n = 15018318;
    if (gray > 0.6279) n = 16272942;
    if (gray > 0.6512) n = 18415153;
    if (gray > 0.6744) n = 32641183;
    if (gray > 0.6977) n = 32540207;
    if (gray > 0.7209) n = 18732593;
    if (gray > 0.7442) n = 18667121;
    if (gray > 0.7674) n = 16267326;
    if (gray > 0.7907) n = 32575775;
    if (gray > 0.8140) n = 15022414;
    if (gray > 0.8372) n = 15255537;
    if (gray > 0.8605) n = 32032318;
    if (gray > 0.8837) n = 32045617;
    if (gray > 0.9070) n = 33081316;
    if (gray > 0.9302) n = 32045630;
    if (gray > 0.9535) n = 33061407;
    if (gray > 0.9767) n = 11512810;
	*/
    
	vec2 p = mod(pos/4.0, 2.0) - vec2(1.0);
    
    col = col*character(n, p);
	
	return vec4(col.rgb, 1.);
}

in vec2 vTexCoord;
out vec4 fragColor;
void main() {
    
  vec2 resolution = vec2(textureSize(u_src, 0));
  vec2 uv = vTexCoord;
  vec2 ab = texture(u_src, uv).rg;
  float alpha = 1.;

  if (u_pixelate != 0) {
    // pixelation
    vec2 xy = uv * resolution;
    vec2 gridxy;
    if (u_pixelate == 1) {
      // square grid
      gridxy = floor(xy / u_pixel_size) * u_pixel_size + u_pixel_size / 2.;
    } else if (u_pixelate == 2) {
      // hexagonal grid
      float size = u_pixel_size / sqrt(3.);
      vec3 cube = cube_round(xy_to_cube(xy, size));
      gridxy = cube_to_xy(cube, size);
    }    
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
