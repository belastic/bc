////////////////////////////////////////////////////////////////////////////////////////////
// inlined from Shox: https://github.com/ZRNOF/Shox
// 
// p5js does not provide a modular developement model. So I am cutting and pasting relevant
// shox functions into this file.
////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Laplacian
 * - vec2 laplacian5(vec2 uv, sampler2D tex, vec2 texelSize)
 * - vec2 laplacian5Wrap(vec2 uv, sampler2D tex, vec2 texelSize)
 * - vec2 laplacian9(vec2 uv, sampler2D tex, vec2 texelSize)
 * - vec2 laplacian9Wrap(vec2 uv, sampler2D tex, vec2 texelSize)
 * - vec2 laplacianS(vec2 uv, sampler2D tex, vec2 texelSize)
 * - vec2 laplacianSWrap(vec2 uv, sampler2D tex, vec2 texelSize)
 * @type {string}
 */
const shox_laplacian = `
	// The implementation is based on Wikipedia:
	// Discrete Laplace operator: https://en.wikipedia.org/wiki/Discrete_Laplace_operator

	vec2 laplacian5(vec2 uv, sampler2D tex, vec2 texelSize) {
		vec2 sum = vec2(0.);
		sum +=  1.*texture( tex, uv+vec2( -1.,  0. )*texelSize ).xy;
		sum +=  1.*texture( tex, uv+vec2(  0., -1. )*texelSize ).xy;
		sum += -4.*texture( tex, uv+vec2(  0.,  0. )*texelSize ).xy;
		sum +=  1.*texture( tex, uv+vec2(  0.,  1. )*texelSize ).xy;
		sum +=  1.*texture( tex, uv+vec2(  1.,  0. )*texelSize ).xy;
		return sum;
	}

	vec2 laplacian5Wrap(vec2 uv, sampler2D tex, vec2 texelSize) {
		vec2 sum = vec2(0.);
		sum +=  1.*texture( tex, fract(uv+vec2( -1.,  0. )*texelSize) ).xy;
		sum +=  1.*texture( tex, fract(uv+vec2(  0., -1. )*texelSize) ).xy;
		sum += -4.*texture( tex, fract(uv+vec2(  0.,  0. )*texelSize) ).xy;
		sum +=  1.*texture( tex, fract(uv+vec2(  0.,  1. )*texelSize) ).xy;
		sum +=  1.*texture( tex, fract(uv+vec2(  1.,  0. )*texelSize) ).xy;
		return sum;
	}

	vec2 laplacian9(vec2 uv, sampler2D tex, vec2 texelSize) {
		vec2 sum = vec2(0.);
		sum +=  1.*texture( tex, uv+vec2( -1., -1. )*texelSize ).xy;
		sum +=  1.*texture( tex, uv+vec2( -1.,  0. )*texelSize ).xy;
		sum +=  1.*texture( tex, uv+vec2( -1.,  1. )*texelSize ).xy;
		sum +=  1.*texture( tex, uv+vec2(  0., -1. )*texelSize ).xy;
		sum += -8.*texture( tex, uv+vec2(  0.,  0. )*texelSize ).xy;
		sum +=  1.*texture( tex, uv+vec2(  0.,  1. )*texelSize ).xy;
		sum +=  1.*texture( tex, uv+vec2(  1., -1. )*texelSize ).xy;
		sum +=  1.*texture( tex, uv+vec2(  1.,  0. )*texelSize ).xy;
		sum +=  1.*texture( tex, uv+vec2(  1.,  1. )*texelSize ).xy;
		return sum;
	}

	vec2 laplacian9Wrap(vec2 uv, sampler2D tex, vec2 texelSize) {
		vec2 sum = vec2(0.);
		sum +=  1.*texture( tex, fract(uv+vec2( -1., -1. )*texelSize) ).xy;
		sum +=  1.*texture( tex, fract(uv+vec2( -1.,  0. )*texelSize) ).xy;
		sum +=  1.*texture( tex, fract(uv+vec2( -1.,  1. )*texelSize) ).xy;
		sum +=  1.*texture( tex, fract(uv+vec2(  0., -1. )*texelSize) ).xy;
		sum += -8.*texture( tex, fract(uv+vec2(  0.,  0. )*texelSize) ).xy;
		sum +=  1.*texture( tex, fract(uv+vec2(  0.,  1. )*texelSize) ).xy;
		sum +=  1.*texture( tex, fract(uv+vec2(  1., -1. )*texelSize) ).xy;
		sum +=  1.*texture( tex, fract(uv+vec2(  1.,  0. )*texelSize) ).xy;
		sum +=  1.*texture( tex, fract(uv+vec2(  1.,  1. )*texelSize) ).xy;
		return sum;
	}

	vec2 laplacianS(vec2 uv, sampler2D tex, vec2 texelSize) {
		vec2 sum = vec2(0.);
		sum += .25*texture( tex, uv+vec2( -1., -1. )*texelSize ).xy;
		sum +=  .5*texture( tex, uv+vec2( -1.,  0. )*texelSize ).xy;
		sum += .25*texture( tex, uv+vec2( -1.,  1. )*texelSize ).xy;
		sum +=  .5*texture( tex, uv+vec2(  0., -1. )*texelSize ).xy;
		sum += -3.*texture( tex, uv+vec2(  0.,  0. )*texelSize ).xy;
		sum +=  .5*texture( tex, uv+vec2(  0.,  1. )*texelSize ).xy;
		sum += .25*texture( tex, uv+vec2(  1., -1. )*texelSize ).xy;
		sum +=  .5*texture( tex, uv+vec2(  1.,  0. )*texelSize ).xy;
		sum += .25*texture( tex, uv+vec2(  1.,  1. )*texelSize ).xy;
		return sum;
	}

	vec2 laplacianSWrap(vec2 uv, sampler2D tex, vec2 texelSize) {
		vec2 sum = vec2(0.);
		sum += .25*texture( tex, fract(uv+vec2( -1., -1. )*texelSize) ).xy;
		sum +=  .5*texture( tex, fract(uv+vec2( -1.,  0. )*texelSize) ).xy;
		sum += .25*texture( tex, fract(uv+vec2( -1.,  1. )*texelSize) ).xy;
		sum +=  .5*texture( tex, fract(uv+vec2(  0., -1. )*texelSize) ).xy;
		sum += -3.*texture( tex, fract(uv+vec2(  0.,  0. )*texelSize) ).xy;
		sum +=  .5*texture( tex, fract(uv+vec2(  0.,  1. )*texelSize) ).xy;
		sum += .25*texture( tex, fract(uv+vec2(  1., -1. )*texelSize) ).xy;
		sum +=  .5*texture( tex, fract(uv+vec2(  1.,  0. )*texelSize) ).xy;
		sum += .25*texture( tex, fract(uv+vec2(  1.,  1. )*texelSize) ).xy;
		return sum;
	}
`

/**
 * Emboss
 * - vec3 emboss2H      (vec2 uv, sampler2D tex, vec2 texelSize, float strength)
 * - vec3 emboss2HWrap  (vec2 uv, sampler2D tex, vec2 texelSize, float strength)
 * - vec3 emboss2V      (vec2 uv, sampler2D tex, vec2 texelSize, float strength)
 * - vec3 emboss2VWrap  (vec2 uv, sampler2D tex, vec2 texelSize, float strength)
 * - vec3 emboss2SA     (vec2 uv, sampler2D tex, vec2 texelSize, float strength)
 * - vec3 emboss2SAWrap (vec2 uv, sampler2D tex, vec2 texelSize, float strength)
 * - vec3 emboss2SB     (vec2 uv, sampler2D tex, vec2 texelSize, float strength)
 * - vec3 emboss2SBWrap (vec2 uv, sampler2D tex, vec2 texelSize, float strength)
 * - vec3 emboss6SA     (vec2 uv, sampler2D tex, vec2 texelSize, float strength)
 * - vec3 emboss6SAWrap (vec2 uv, sampler2D tex, vec2 texelSize, float strength)
 * - vec3 emboss6SB     (vec2 uv, sampler2D tex, vec2 texelSize, float strength)
 * - vec3 emboss6SBWrap (vec2 uv, sampler2D tex, vec2 texelSize, float strength)
 * @type {string}
 */
const shox_emboss = `
	// The implementation is based on Wikipedia:
	// Image embossing: https://en.wikipedia.org/wiki/Image_embossing

	vec3 emboss2H(vec2 uv, sampler2D tex, vec2 texelSize, float strength) {
		vec3 result = vec3(0.);
		result +=  strength*texture( tex, uv+vec2( -1.,  0. )*texelSize ).rgb;
		result += -strength*texture( tex, uv+vec2(  1.,  0. )*texelSize ).rgb;
		return result;
	}

	vec3 emboss2HWrap(vec2 uv, sampler2D tex, vec2 texelSize, float strength) {
		vec3 result = vec3(0.);
		result +=  strength*texture( tex, fract(uv+vec2( -1.,  0. )*texelSize) ).rgb;
		result += -strength*texture( tex, fract(uv+vec2(  1.,  0. )*texelSize) ).rgb;
		return result;
	}

	vec3 emboss2V(vec2 uv, sampler2D tex, vec2 texelSize, float strength) {
		vec3 result = vec3(0.);
		result +=  strength*texture( tex, uv+vec2(  0., -1. )*texelSize ).rgb;
		result += -strength*texture( tex, uv+vec2(  0.,  1. )*texelSize ).rgb;
		return result;
	}

	vec3 emboss2VWrap(vec2 uv, sampler2D tex, vec2 texelSize, float strength) {
		vec3 result = vec3(0.);
		result +=  strength*texture( tex, fract(uv+vec2(  0., -1. )*texelSize) ).rgb;
		result += -strength*texture( tex, fract(uv+vec2(  0.,  1. )*texelSize) ).rgb;
		return result;
	}

	vec3 emboss2SA(vec2 uv, sampler2D tex, vec2 texelSize, float strength) {
		vec3 result = vec3(0.);
		result +=  strength*texture( tex, uv+vec2( -1., -1. )*texelSize ).rgb;
		result += -strength*texture( tex, uv+vec2(  1.,  1. )*texelSize ).rgb;
		return result;
	}

	vec3 emboss2SAWrap(vec2 uv, sampler2D tex, vec2 texelSize, float strength) {
		vec3 result = vec3(0.);
		result +=  strength*texture( tex, fract(uv+vec2( -1., -1. )*texelSize) ).rgb;
		result += -strength*texture( tex, fract(uv+vec2(  1.,  1. )*texelSize) ).rgb;
		return result;
	}

	vec3 emboss2SB(vec2 uv, sampler2D tex, vec2 texelSize, float strength) {
		vec3 result = vec3(0.);
		result +=  strength*texture( tex, uv+vec2(  1., -1. )*texelSize ).rgb;
		result += -strength*texture( tex, uv+vec2( -1.,  1. )*texelSize ).rgb;
		return result;
	}

	vec3 emboss2SBWrap(vec2 uv, sampler2D tex, vec2 texelSize, float strength) {
		vec3 result = vec3(0.);
		result +=  strength*texture( tex, fract(uv+vec2(  1., -1. )*texelSize) ).rgb;
		result += -strength*texture( tex, fract(uv+vec2( -1.,  1. )*texelSize) ).rgb;
		return result;
	}

	vec3 emboss6SA(vec2 uv, sampler2D tex, vec2 texelSize, float strength) {
		vec3 result = vec3(0.);
		result += -2.*strength*texture( tex, uv+vec2( -1., -1. )*texelSize ).rgb;
		result += -1.*strength*texture( tex, uv+vec2(  0., -1. )*texelSize ).rgb;
		result += -1.*strength*texture( tex, uv+vec2( -1.,  0. )*texelSize ).rgb;
		result +=  1.*strength*texture( tex, uv+vec2(  1.,  0. )*texelSize ).rgb;
		result +=  1.*strength*texture( tex, uv+vec2(  0.,  1. )*texelSize ).rgb;
		result +=  2.*strength*texture( tex, uv+vec2(  1.,  1. )*texelSize ).rgb;
		return result;
	}

	vec3 emboss6SAWrap(vec2 uv, sampler2D tex, vec2 texelSize, float strength) {
		vec3 result = vec3(0.);
		result += -2.*strength*texture( tex, fract(uv+vec2( -1., -1. )*texelSize) ).rgb;
		result += -1.*strength*texture( tex, fract(uv+vec2(  0., -1. )*texelSize) ).rgb;
		result += -1.*strength*texture( tex, fract(uv+vec2( -1.,  0. )*texelSize) ).rgb;
		result +=  1.*strength*texture( tex, fract(uv+vec2(  1.,  0. )*texelSize) ).rgb;
		result +=  1.*strength*texture( tex, fract(uv+vec2(  0.,  1. )*texelSize) ).rgb;
		result +=  2.*strength*texture( tex, fract(uv+vec2(  1.,  1. )*texelSize) ).rgb;
		return result;
	}

	vec3 emboss6SB(vec2 uv, sampler2D tex, vec2 texelSize, float strength) {
		vec3 result = vec3(0.);
		result += -1.*strength*texture( tex, uv+vec2(  0., -1. )*texelSize ).rgb;
		result += -2.*strength*texture( tex, uv+vec2(  1., -1. )*texelSize ).rgb;
		result +=  1.*strength*texture( tex, uv+vec2( -1.,  0. )*texelSize ).rgb;
		result += -1.*strength*texture( tex, uv+vec2(  1.,  0. )*texelSize ).rgb;
		result +=  2.*strength*texture( tex, uv+vec2( -1.,  1. )*texelSize ).rgb;
		result +=  1.*strength*texture( tex, uv+vec2(  0.,  1. )*texelSize ).rgb;
		return result;
	}

	vec3 emboss6SBWrap(vec2 uv, sampler2D tex, vec2 texelSize, float strength) {
		vec3 result = vec3(0.);
		result += -1.*strength*texture( tex, fract(uv+vec2(  0., -1. )*texelSize) ).rgb;
		result += -2.*strength*texture( tex, fract(uv+vec2(  1., -1. )*texelSize) ).rgb;
		result +=  1.*strength*texture( tex, fract(uv+vec2( -1.,  0. )*texelSize) ).rgb;
		result += -1.*strength*texture( tex, fract(uv+vec2(  1.,  0. )*texelSize) ).rgb;
		result +=  2.*strength*texture( tex, fract(uv+vec2( -1.,  1. )*texelSize) ).rgb;
		result +=  1.*strength*texture( tex, fract(uv+vec2(  0.,  1. )*texelSize) ).rgb;
		return result;
	}
`

/**
 * Palette by Inigo Quilez
 * - vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d)
 * - float t: 0 to 1
 * - vec3 a: brightness
 * - vec3 b: constrast
 * - vec3 c: frequency times
 * - vec3 d: phase
 * @type {string}
 */
const shox_iqPalette = `
	// See https://iquilezles.org/articles/palettes for more information

	vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
		return a + b*cos( 6.28318*(c*t+d) );
	}
`
