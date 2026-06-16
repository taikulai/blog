'use client';

import { useEffect, useRef } from 'react';

interface FluidBackgroundProps {
  active?: boolean;
  onReady?: () => void;
}

interface Pointer {
  id: number;
  texcoordX: number;
  texcoordY: number;
  prevTexcoordX: number;
  prevTexcoordY: number;
  deltaX: number;
  deltaY: number;
  down: boolean;
  moved: boolean;
  color: { r: number; g: number; b: number };
}

interface FBO {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  attach: (id: number) => number;
}

interface DoubleFBO {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  read: FBO;
  write: FBO;
  swap: () => void;
}

interface FormatInfo {
  internalFormat: number;
  format: number;
}

interface GLExt {
  formatRGBA: FormatInfo | null;
  formatRG: FormatInfo | null;
  formatR: FormatInfo | null;
  halfFloatTexType: number;
  supportLinearFiltering: boolean | null;
}

interface Config {
  SIM_RESOLUTION: number;
  DYE_RESOLUTION: number;
  DENSITY_DISSIPATION: number;
  VELOCITY_DISSIPATION: number;
  PRESSURE: number;
  PRESSURE_ITERATIONS: number;
  CURL: number;
  SPLAT_RADIUS: number;
  SPLAT_FORCE: number;
  SHADING: boolean;
  COLORFUL: boolean;
  COLOR_UPDATE_SPEED: number;
  PAUSED: boolean;
  BACK_COLOR: { r: number; g: number; b: number };
  TRANSPARENT: boolean;
  BLOOM: boolean;
  BLOOM_ITERATIONS: number;
  BLOOM_RESOLUTION: number;
  BLOOM_INTENSITY: number;
  BLOOM_THRESHOLD: number;
  BLOOM_SOFT_KNEE: number;
  SUNRAYS: boolean;
  SUNRAYS_RESOLUTION: number;
  SUNRAYS_WEIGHT: number;
}

const defaultConfig: Config = {
  SIM_RESOLUTION: 128,
  DYE_RESOLUTION: 1024,
  DENSITY_DISSIPATION: 1.0,
  VELOCITY_DISSIPATION: 0.2,
  PRESSURE: 0.8,
  PRESSURE_ITERATIONS: 20,
  CURL: 30,
  SPLAT_RADIUS: 0.25,
  SPLAT_FORCE: 6000,
  SHADING: true,
  COLORFUL: true,
  COLOR_UPDATE_SPEED: 0.3,
  PAUSED: false,
  BACK_COLOR: { r: 0, g: 0, b: 0 },
  TRANSPARENT: true,
  BLOOM: true,
  BLOOM_ITERATIONS: 8,
  BLOOM_RESOLUTION: 256,
  BLOOM_INTENSITY: 0.4,
  BLOOM_THRESHOLD: 0.2,
  BLOOM_SOFT_KNEE: 0.7,
  SUNRAYS: true,
  SUNRAYS_RESOLUTION: 256,
  SUNRAYS_WEIGHT: 1.0,
};

// ==================== Shader Source Strings ====================

const baseVertexShaderSource = `
    precision highp float;

    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;

    void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`;

const blurVertexShaderSource = `
    precision highp float;

    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    uniform vec2 texelSize;

    void main () {
        vUv = aPosition * 0.5 + 0.5;
        float offset = 1.33333333;
        vL = vUv - texelSize * offset;
        vR = vUv + texelSize * offset;
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`;

const blurShaderSource = `
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    uniform sampler2D uTexture;

    void main () {
        vec4 sum = texture2D(uTexture, vUv) * 0.29411764;
        sum += texture2D(uTexture, vL) * 0.35294117;
        sum += texture2D(uTexture, vR) * 0.35294117;
        gl_FragColor = sum;
    }
`;

const copyShaderSource = `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    uniform sampler2D uTexture;

    void main () {
        gl_FragColor = texture2D(uTexture, vUv);
    }
`;

const clearShaderSource = `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    uniform float value;

    void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
    }
`;

const colorShaderSource = `
    precision mediump float;

    uniform vec4 color;

    void main () {
        gl_FragColor = color;
    }
`;

const checkerboardShaderSource = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float aspectRatio;

    #define SCALE 25.0

    void main () {
        vec2 uv = floor(vUv * SCALE * vec2(aspectRatio, 1.0));
        float v = mod(uv.x + uv.y, 2.0);
        v = v * 0.1 + 0.8;
        gl_FragColor = vec4(vec3(v), 1.0);
    }
`;

const displayShaderSource = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform sampler2D uBloom;
    uniform sampler2D uSunrays;
    uniform sampler2D uDithering;
    uniform vec2 ditherScale;
    uniform vec2 texelSize;

    vec3 linearToGamma (vec3 color) {
        color = max(color, vec3(0));
        return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
    }

    void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;

    #ifdef SHADING
        vec3 lc = texture2D(uTexture, vL).rgb;
        vec3 rc = texture2D(uTexture, vR).rgb;
        vec3 tc = texture2D(uTexture, vT).rgb;
        vec3 bc = texture2D(uTexture, vB).rgb;

        float dx = length(rc) - length(lc);
        float dy = length(tc) - length(bc);

        vec3 n = normalize(vec3(dx, dy, length(texelSize)));
        vec3 l = vec3(0.0, 0.0, 1.0);

        float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
        c *= diffuse;
    #endif

    #ifdef BLOOM
        vec3 bloom = texture2D(uBloom, vUv).rgb;
    #endif

    #ifdef SUNRAYS
        float sunrays = texture2D(uSunrays, vUv).r;
        c *= sunrays;
    #ifdef BLOOM
        bloom *= sunrays;
    #endif
    #endif

    #ifdef BLOOM
        float noise = texture2D(uDithering, vUv * ditherScale).r;
        noise = noise * 2.0 - 1.0;
        bloom += noise / 255.0;
        bloom = linearToGamma(bloom);
        c += bloom;
    #endif

        float a = max(c.r, max(c.g, c.b));
        gl_FragColor = vec4(c, a);
    }
`;

const bloomPrefilterShaderSource = `
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform vec3 curve;
    uniform float threshold;

    void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;
        float br = max(c.r, max(c.g, c.b));
        float rq = clamp(br - curve.x, 0.0, curve.y);
        rq = curve.z * rq * rq;
        c *= max(rq, br - threshold) / max(br, 0.0001);
        gl_FragColor = vec4(c, 0.0);
    }
`;

const bloomBlurShaderSource = `
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;

    void main () {
        vec4 sum = vec4(0.0);
        sum += texture2D(uTexture, vL);
        sum += texture2D(uTexture, vR);
        sum += texture2D(uTexture, vT);
        sum += texture2D(uTexture, vB);
        sum *= 0.25;
        gl_FragColor = sum;
    }
`;

const bloomFinalShaderSource = `
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform float intensity;

    void main () {
        vec4 sum = vec4(0.0);
        sum += texture2D(uTexture, vL);
        sum += texture2D(uTexture, vR);
        sum += texture2D(uTexture, vT);
        sum += texture2D(uTexture, vB);
        sum *= 0.25;
        gl_FragColor = sum * intensity;
    }
`;

const sunraysMaskShaderSource = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;

    void main () {
        vec4 c = texture2D(uTexture, vUv);
        float br = max(c.r, max(c.g, c.b));
        c.a = 1.0 - min(max(br * 20.0, 0.0), 0.8);
        gl_FragColor = c;
    }
`;

const sunraysShaderSource = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float weight;

    #define ITERATIONS 16

    void main () {
        float Density = 0.3;
        float Decay = 0.95;
        float Exposure = 0.7;

        vec2 coord = vUv;
        vec2 dir = vUv - 0.5;

        dir *= 1.0 / float(ITERATIONS) * Density;
        float illuminationDecay = 1.0;

        float color = texture2D(uTexture, vUv).a;

        for (int i = 0; i < ITERATIONS; i++)
        {
            coord -= dir;
            float col = texture2D(uTexture, coord).a;
            color += col * illuminationDecay * weight;
            illuminationDecay *= Decay;
        }

        gl_FragColor = vec4(color * Exposure, 0.0, 0.0, 1.0);
    }
`;

const splatShaderSource = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;

    void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
    }
`;

const advectionShaderSource = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform vec2 dyeTexelSize;
    uniform float dt;
    uniform float dissipation;

    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
        vec2 st = uv / tsize - 0.5;

        vec2 iuv = floor(st);
        vec2 fuv = fract(st);

        vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
        vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
        vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
        vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

        return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }

    void main () {
    #ifdef MANUAL_FILTERING
        vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
        vec4 result = bilerp(uSource, coord, dyeTexelSize);
    #else
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        vec4 result = texture2D(uSource, coord);
    #endif
        float decay = 1.0 + dissipation * dt;
        gl_FragColor = result / decay;
    }
`;

const divergenceShaderSource = `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;

        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) { L = -C.x; }
        if (vR.x > 1.0) { R = -C.x; }
        if (vT.y > 1.0) { T = -C.y; }
        if (vB.y < 0.0) { B = -C.y; }

        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
`;

const curlShaderSource = `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
    }
`;

const vorticityShaderSource = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl;
    uniform float dt;

    void main () {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;

        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;

        vec2 vel = texture2D(uVelocity, vUv).xy;
        gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
    }
`;

const pressureShaderSource = `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;

    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float C = texture2D(uPressure, vUv).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }
`;

const gradientSubtractShaderSource = `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
`;

// ==================== Utility Functions ====================

function hashCode(s: string): number {
  if (s.length === 0) return 0;
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function HSVtoRGB(h: number, s: number, v: number): { r: number; g: number; b: number } {
  let r: number, g: number, b: number;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    default: r = v; g = p; b = q; break;
  }

  return { r, g, b };
}

function generateColor(): { r: number; g: number; b: number } {
  const c = HSVtoRGB(Math.random(), 1.0, 1.0);
  c.r *= 0.15;
  c.g *= 0.15;
  c.b *= 0.15;
  return c;
}

function normalizeColor(input: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
  return {
    r: input.r / 255,
    g: input.g / 255,
    b: input.b / 255,
  };
}

function wrap(value: number, min: number, max: number): number {
  const range = max - min;
  if (range === 0) return min;
  return ((value - min) % range) + min;
}

function scaleByPixelRatio(input: number): number {
  const pixelRatio = window.devicePixelRatio || 1;
  return Math.floor(input * pixelRatio);
}

function isMobile(): boolean {
  return /Mobi|Android/i.test(navigator.userAgent);
}

// ==================== Component ====================

export default function FluidBackground({ active = true, onReady }: FluidBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const config = { ...defaultConfig };

    // Adjust for mobile
    if (isMobile()) {
      config.DYE_RESOLUTION = 512;
    }

    // ==================== WebGL Context ====================

    function getWebGLContext(canvas: HTMLCanvasElement): { gl: WebGL2RenderingContext | WebGLRenderingContext; ext: GLExt } | null {
      const params: WebGLContextAttributes = {
        alpha: true,
        depth: false,
        stencil: false,
        antialias: false,
        preserveDrawingBuffer: false,
      };

      let gl = canvas.getContext('webgl2', params) as WebGL2RenderingContext | null;
      const isWebGL2 = !!gl;
      if (!isWebGL2) {
        gl = (canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params)) as WebGLRenderingContext | null;
      }
      if (!gl) return null;

      let halfFloat: OES_texture_half_float | null = null;
      let supportLinearFiltering: OES_texture_float_linear | OES_texture_half_float_linear | null = null;
      if (isWebGL2) {
        (gl as WebGL2RenderingContext).getExtension('EXT_color_buffer_float');
        supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
      } else {
        halfFloat = gl.getExtension('OES_texture_half_float');
        supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
      }

      gl.clearColor(0.0, 0.0, 0.0, 1.0);

      const halfFloatTexType = isWebGL2
        ? (gl as WebGL2RenderingContext).HALF_FLOAT
        : halfFloat!.HALF_FLOAT_OES;

      let formatRGBA: FormatInfo | null;
      let formatRG: FormatInfo | null;
      let formatR: FormatInfo | null;

      if (isWebGL2) {
        const gl2 = gl as WebGL2RenderingContext;
        formatRGBA = getSupportedFormat(gl, gl2.RGBA16F, gl2.RGBA, halfFloatTexType);
        formatRG = getSupportedFormat(gl, gl2.RG16F, gl2.RG, halfFloatTexType);
        formatR = getSupportedFormat(gl, gl2.R16F, gl2.RED, halfFloatTexType);
      } else {
        formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
        formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
        formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
      }

      if (!formatRGBA || !formatRG || !formatR) {
        // Fallback: disable features that need specific formats
        config.SHADING = false;
        config.BLOOM = false;
        config.SUNRAYS = false;
        config.DYE_RESOLUTION = 512;
      }

      if (!supportLinearFiltering) {
        config.DYE_RESOLUTION = 512;
        config.SHADING = false;
        config.BLOOM = false;
        config.SUNRAYS = false;
      }

      return {
        gl,
        ext: {
          formatRGBA: formatRGBA || { internalFormat: gl.RGBA, format: gl.RGBA },
          formatRG: formatRG || { internalFormat: gl.RGBA, format: gl.RGBA },
          formatR: formatR || { internalFormat: gl.RGBA, format: gl.RGBA },
          halfFloatTexType,
          supportLinearFiltering: !!supportLinearFiltering,
        },
      };
    }

    function getSupportedFormat(
      gl: WebGLRenderingContext | WebGL2RenderingContext,
      internalFormat: number,
      format: number,
      type: number
    ): FormatInfo | null {
      if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
        const gl2 = gl as WebGL2RenderingContext;
        switch (internalFormat) {
          case gl2.R16F:
            return getSupportedFormat(gl, gl2.RG16F, gl2.RG, type);
          case gl2.RG16F:
            return getSupportedFormat(gl, gl2.RGBA16F, gl2.RGBA, type);
          default:
            return null;
        }
      }
      return { internalFormat, format };
    }

    function supportRenderTextureFormat(
      gl: WebGLRenderingContext | WebGL2RenderingContext,
      internalFormat: number,
      format: number,
      type: number
    ): boolean {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      gl.deleteTexture(texture);
      gl.deleteFramebuffer(fbo);
      return status === gl.FRAMEBUFFER_COMPLETE;
    }

    // ==================== Shader Compilation ====================

    function compileShader(
      gl: WebGLRenderingContext | WebGL2RenderingContext,
      type: number,
      source: string,
      keywords: string[] | null = null
    ): WebGLShader {
      let src = source;
      if (keywords != null) {
        let keywordsString = '';
        for (const keyword of keywords) {
          keywordsString += '#define ' + keyword + '\n';
        }
        src = keywordsString + source;
      }

      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error('Shader compile error: ' + info);
      }

      return shader;
    }

    function createProgram(
      gl: WebGLRenderingContext | WebGL2RenderingContext,
      vertexShader: WebGLShader,
      fragmentShader: WebGLShader
    ): WebGLProgram {
      const program = gl.createProgram()!;
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error('Program link error: ' + gl.getProgramInfoLog(program));
      }

      return program;
    }

    function getUniforms(
      gl: WebGLRenderingContext | WebGL2RenderingContext,
      program: WebGLProgram
    ): Record<string, WebGLUniformLocation | null> {
      const uniforms: Record<string, WebGLUniformLocation | null> = {};
      const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < uniformCount; i++) {
        const uniformName = gl.getActiveUniform(program, i)!.name;
        uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
      }
      return uniforms;
    }

    // ==================== Material & Program Classes ====================

    class Material {
      vertexShader: WebGLShader;
      fragmentShaderSource: string;
      programs: Record<number, WebGLProgram>;
      activeProgram: WebGLProgram | null;
      uniforms: Record<string, WebGLUniformLocation | null>;

      constructor(vertexShader: WebGLShader, fragmentShaderSource: string) {
        this.vertexShader = vertexShader;
        this.fragmentShaderSource = fragmentShaderSource;
        this.programs = {};
        this.activeProgram = null;
        this.uniforms = {};
      }

      setKeywords(keywords: string[]): void {
        let hash = 0;
        for (let i = 0; i < keywords.length; i++) {
          hash += hashCode(keywords[i]);
        }

        let program = this.programs[hash];
        if (program == null) {
          const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
          program = createProgram(gl, this.vertexShader, fragmentShader);
          this.programs[hash] = program;
        }

        if (program === this.activeProgram) return;

        this.uniforms = getUniforms(gl, program);
        this.activeProgram = program;
      }

      bind(): void {
        gl.useProgram(this.activeProgram);
      }
    }

    class Program {
      uniforms: Record<string, WebGLUniformLocation | null>;
      program: WebGLProgram;

      constructor(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
        this.uniforms = {};
        this.program = createProgram(gl, vertexShader, fragmentShader);
        this.uniforms = getUniforms(gl, this.program);
      }

      bind(): void {
        gl.useProgram(this.program);
      }
    }

    // ==================== Initialize GL ====================

    const ctxResult = getWebGLContext(canvas);
    if (!ctxResult) return;

    const { gl, ext } = ctxResult;

    // Compile vertex shaders
    const baseVertexShader = compileShader(gl, gl.VERTEX_SHADER, baseVertexShaderSource);
    const blurVertexShader = compileShader(gl, gl.VERTEX_SHADER, blurVertexShaderSource);

    // Compile fragment shaders
    const advectionKeywords = ext.supportLinearFiltering ? null : ['MANUAL_FILTERING'];

    const blurProgram = new Program(blurVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, blurShaderSource));
    const copyProgram = new Program(baseVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, copyShaderSource));
    const clearProgram = new Program(baseVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, clearShaderSource));
    const colorProgram = new Program(baseVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, colorShaderSource));
    const checkerboardProgram = new Program(baseVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, checkerboardShaderSource));
    const bloomPrefilterProgram = new Program(baseVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, bloomPrefilterShaderSource));
    const bloomBlurProgram = new Program(baseVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, bloomBlurShaderSource));
    const bloomFinalProgram = new Program(baseVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, bloomFinalShaderSource));
    const sunraysMaskProgram = new Program(baseVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, sunraysMaskShaderSource));
    const sunraysProgram = new Program(baseVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, sunraysShaderSource));
    const splatProgram = new Program(baseVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, splatShaderSource));
    const advectionProgram = new Program(baseVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, advectionShaderSource, advectionKeywords));
    const divergenceProgram = new Program(baseVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, divergenceShaderSource));
    const curlProgram = new Program(baseVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, curlShaderSource));
    const vorticityProgram = new Program(baseVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, vorticityShaderSource));
    const pressureProgram = new Program(baseVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, pressureShaderSource));
    const gradientSubtractProgram = new Program(baseVertexShader, compileShader(gl, gl.FRAGMENT_SHADER, gradientSubtractShaderSource));

    const displayMaterial = new Material(baseVertexShader, displayShaderSource);

    // ==================== Blit Setup ====================

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    function blit(destination: WebGLFramebuffer | null): void {
      gl.bindFramebuffer(gl.FRAMEBUFFER, destination);
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    // ==================== FBO Management ====================

    function getResolution(resolution: number): { width: number; height: number } {
      let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
      if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;

      const min = Math.round(resolution);
      const max = Math.round(resolution * aspectRatio);

      if (gl.drawingBufferWidth > gl.drawingBufferHeight) {
        return { width: max, height: min };
      } else {
        return { width: min, height: max };
      }
    }

    function createFBO(
      w: number,
      h: number,
      internalFormat: number,
      format: number,
      type: number,
      param: number
    ): FBO {
      gl.activeTexture(gl.TEXTURE0);
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const texelSizeX = 1.0 / w;
      const texelSizeY = 1.0 / h;

      return {
        texture,
        fbo,
        width: w,
        height: h,
        texelSizeX,
        texelSizeY,
        attach(id: number): number {
          gl.activeTexture(gl.TEXTURE0 + id);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          return id;
        },
      };
    }

    function createDoubleFBO(
      w: number,
      h: number,
      internalFormat: number,
      format: number,
      type: number,
      param: number
    ): DoubleFBO {
      let fbo1 = createFBO(w, h, internalFormat, format, type, param);
      let fbo2 = createFBO(w, h, internalFormat, format, type, param);

      return {
        width: w,
        height: h,
        texelSizeX: fbo1.texelSizeX,
        texelSizeY: fbo1.texelSizeY,
        get read(): FBO {
          return fbo1;
        },
        set read(value: FBO) {
          fbo1 = value;
        },
        get write(): FBO {
          return fbo2;
        },
        set write(value: FBO) {
          fbo2 = value;
        },
        swap(): void {
          const temp = fbo1;
          fbo1 = fbo2;
          fbo2 = temp;
        },
      };
    }

    function resizeFBO(
      target: FBO,
      w: number,
      h: number,
      internalFormat: number,
      format: number,
      type: number,
      param: number
    ): FBO {
      const newFBO = createFBO(w, h, internalFormat, format, type, param);
      copyProgram.bind();
      gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0));
      blit(newFBO.fbo);
      return newFBO;
    }

    function resizeDoubleFBO(
      target: DoubleFBO,
      w: number,
      h: number,
      internalFormat: number,
      format: number,
      type: number,
      param: number
    ): DoubleFBO {
      if (target.width === w && target.height === h) return target;
      target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param);
      target.write = createFBO(w, h, internalFormat, format, type, param);
      target.width = w;
      target.height = h;
      target.texelSizeX = 1.0 / w;
      target.texelSizeY = 1.0 / h;
      return target;
    }

    // ==================== Dithering Texture ====================

    function createDitheringTexture(): { texture: WebGLTexture; width: number; height: number; attach: (id: number) => number } {
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255]));

      const obj = {
        texture,
        width: 1,
        height: 1,
        attach(id: number): number {
          gl.activeTexture(gl.TEXTURE0 + id);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          return id;
        },
      };

      // Generate a simple noise texture for dithering
      const size = 256;
      const data = new Uint8Array(size * size * 3);
      for (let i = 0; i < size * size * 3; i++) {
        data[i] = Math.random() * 255;
      }
      obj.width = size;
      obj.height = size;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, size, size, 0, gl.RGB, gl.UNSIGNED_BYTE, data);

      return obj;
    }

    const ditheringTexture = createDitheringTexture();

    // ==================== Framebuffer State ====================

    let dye: DoubleFBO | null = null;
    let velocity: DoubleFBO | null = null;
    let divergence: FBO | null = null;
    let curl: FBO | null = null;
    let pressure: DoubleFBO | null = null;
    let bloom: FBO | null = null;
    let bloomFramebuffers: FBO[] = [];
    let sunrays: FBO | null = null;
    let sunraysTemp: FBO | null = null;

    function initFramebuffers(): void {
      const simRes = getResolution(config.SIM_RESOLUTION);
      const dyeRes = getResolution(config.DYE_RESOLUTION);

      const texType = ext.halfFloatTexType;
      const rgba = ext.formatRGBA!;
      const rg = ext.formatRG!;
      const r = ext.formatR!;
      const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

      if (dye == null) {
        dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
      } else {
        dye = resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
      }

      if (velocity == null) {
        velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
      } else {
        velocity = resizeDoubleFBO(velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
      }

      divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
      curl = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
      pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);

      initBloomFramebuffers();
      initSunraysFramebuffers();
    }

    function initBloomFramebuffers(): void {
      const res = getResolution(config.BLOOM_RESOLUTION);

      const texType = ext.halfFloatTexType;
      const rgba = ext.formatRGBA!;
      const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

      bloom = createFBO(res.width, res.height, rgba.internalFormat, rgba.format, texType, filtering);

      bloomFramebuffers = [];
      for (let i = 0; i < config.BLOOM_ITERATIONS; i++) {
        const width = res.width >> (i + 1);
        const height = res.height >> (i + 1);

        if (width < 2 || height < 2) break;

        const fbo = createFBO(width, height, rgba.internalFormat, rgba.format, texType, filtering);
        bloomFramebuffers.push(fbo);
      }
    }

    function initSunraysFramebuffers(): void {
      const res = getResolution(config.SUNRAYS_RESOLUTION);

      const texType = ext.halfFloatTexType;
      const r = ext.formatR!;
      const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

      sunrays = createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering);
      sunraysTemp = createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering);
    }

    // ==================== Pointer State ====================

    const pointers: Pointer[] = [
      {
        id: -1,
        texcoordX: 0,
        texcoordY: 0,
        prevTexcoordX: 0,
        prevTexcoordY: 0,
        deltaX: 0,
        deltaY: 0,
        down: false,
        moved: false,
        color: { r: 0.15, g: 0, b: 0.15 },
      },
    ];
    const splatStack: number[] = [];

    function updatePointerDownData(pointer: Pointer, id: number, posX: number, posY: number): void {
      pointer.id = id;
      pointer.down = true;
      pointer.moved = false;
      pointer.texcoordX = posX / canvas.width;
      pointer.texcoordY = 1.0 - posY / canvas.height;
      pointer.prevTexcoordX = pointer.texcoordX;
      pointer.prevTexcoordY = pointer.texcoordY;
      pointer.deltaX = 0;
      pointer.deltaY = 0;
      pointer.color = generateColor();
    }

    function updatePointerMoveData(pointer: Pointer, posX: number, posY: number): void {
      pointer.prevTexcoordX = pointer.texcoordX;
      pointer.prevTexcoordY = pointer.texcoordY;
      pointer.texcoordX = posX / canvas.width;
      pointer.texcoordY = 1.0 - posY / canvas.height;
      pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
      pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
      pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
    }

    function updatePointerUpData(pointer: Pointer): void {
      pointer.down = false;
    }

    function correctDeltaX(delta: number): number {
      const aspectRatio = canvas.width / canvas.height;
      if (aspectRatio < 1) delta *= aspectRatio;
      return delta;
    }

    function correctDeltaY(delta: number): number {
      const aspectRatio = canvas.width / canvas.height;
      if (aspectRatio > 1) delta /= aspectRatio;
      return delta;
    }

    function correctRadius(radius: number): number {
      const aspectRatio = canvas.width / canvas.height;
      if (aspectRatio > 1) radius *= aspectRatio;
      return radius;
    }

    // ==================== Simulation Step ====================

    function step(dt: number): void {
      gl.disable(gl.BLEND);
      gl.viewport(0, 0, velocity!.width, velocity!.height);

      curlProgram.bind();
      gl.uniform2f(curlProgram.uniforms.texelSize, velocity!.texelSizeX, velocity!.texelSizeY);
      gl.uniform1i(curlProgram.uniforms.uVelocity, velocity!.read.attach(0));
      blit(curl!.fbo);

      vorticityProgram.bind();
      gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity!.texelSizeX, velocity!.texelSizeY);
      gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity!.read.attach(0));
      gl.uniform1i(vorticityProgram.uniforms.uCurl, curl!.attach(1));
      gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
      gl.uniform1f(vorticityProgram.uniforms.dt, dt);
      blit(velocity!.write.fbo);
      velocity!.swap();

      divergenceProgram.bind();
      gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity!.texelSizeX, velocity!.texelSizeY);
      gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity!.read.attach(0));
      blit(divergence!.fbo);

      clearProgram.bind();
      gl.uniform1i(clearProgram.uniforms.uTexture, pressure!.read.attach(0));
      gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE);
      blit(pressure!.write.fbo);
      pressure!.swap();

      pressureProgram.bind();
      gl.uniform2f(pressureProgram.uniforms.texelSize, velocity!.texelSizeX, velocity!.texelSizeY);
      gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence!.attach(0));
      for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(pressureProgram.uniforms.uPressure, pressure!.read.attach(1));
        blit(pressure!.write.fbo);
        pressure!.swap();
      }

      gradientSubtractProgram.bind();
      gl.uniform2f(gradientSubtractProgram.uniforms.texelSize, velocity!.texelSizeX, velocity!.texelSizeY);
      gl.uniform1i(gradientSubtractProgram.uniforms.uPressure, pressure!.read.attach(0));
      gl.uniform1i(gradientSubtractProgram.uniforms.uVelocity, velocity!.read.attach(1));
      blit(velocity!.write.fbo);
      velocity!.swap();

      advectionProgram.bind();
      gl.uniform2f(advectionProgram.uniforms.texelSize, velocity!.texelSizeX, velocity!.texelSizeY);
      if (!ext.supportLinearFiltering) {
        gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity!.texelSizeX, velocity!.texelSizeY);
      }
      const velocityId = velocity!.read.attach(0);
      gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
      gl.uniform1i(advectionProgram.uniforms.uSource, velocityId);
      gl.uniform1f(advectionProgram.uniforms.dt, dt);
      gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
      blit(velocity!.write.fbo);
      velocity!.swap();

      gl.viewport(0, 0, dye!.width, dye!.height);

      if (!ext.supportLinearFiltering) {
        gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye!.texelSizeX, dye!.texelSizeY);
      }
      gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity!.read.attach(0));
      gl.uniform1i(advectionProgram.uniforms.uSource, dye!.read.attach(1));
      gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
      blit(dye!.write.fbo);
      dye!.swap();
    }

    // ==================== Splat ====================

    function splat(x: number, y: number, dx: number, dy: number, color: { r: number; g: number; b: number }): void {
      gl.viewport(0, 0, velocity!.width, velocity!.height);
      splatProgram.bind();
      gl.uniform1i(splatProgram.uniforms.uTarget, velocity!.read.attach(0));
      gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
      gl.uniform2f(splatProgram.uniforms.point, x, y);
      gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0);
      gl.uniform1f(splatProgram.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100.0));
      blit(velocity!.write.fbo);
      velocity!.swap();

      gl.viewport(0, 0, dye!.width, dye!.height);
      gl.uniform1i(splatProgram.uniforms.uTarget, dye!.read.attach(0));
      gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
      blit(dye!.write.fbo);
      dye!.swap();
    }

    function splatPointer(pointer: Pointer): void {
      const dx = pointer.deltaX * config.SPLAT_FORCE;
      const dy = pointer.deltaY * config.SPLAT_FORCE;
      splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
    }

    function multipleSplats(amount: number): void {
      for (let i = 0; i < amount; i++) {
        const color = generateColor();
        color.r *= 10.0;
        color.g *= 10.0;
        color.b *= 10.0;
        const x = Math.random();
        const y = Math.random();
        const dx = 1000 * (Math.random() - 0.5);
        const dy = 1000 * (Math.random() - 0.5);
        splat(x, y, dx, dy, color);
      }
    }

    // ==================== Rendering ====================

    function applyBloom(source: FBO, destination: FBO): void {
      if (bloomFramebuffers.length < 2) return;

      let last = destination;

      gl.disable(gl.BLEND);
      bloomPrefilterProgram.bind();
      const knee = config.BLOOM_THRESHOLD * config.BLOOM_SOFT_KNEE + 0.0001;
      const curve0 = config.BLOOM_THRESHOLD - knee;
      const curve1 = knee * 2;
      const curve2 = 0.25 / knee;
      gl.uniform3f(bloomPrefilterProgram.uniforms.curve, curve0, curve1, curve2);
      gl.uniform1f(bloomPrefilterProgram.uniforms.threshold, config.BLOOM_THRESHOLD);
      gl.uniform1i(bloomPrefilterProgram.uniforms.uTexture, source.attach(0));
      gl.viewport(0, 0, last.width, last.height);
      blit(last.fbo);

      bloomBlurProgram.bind();
      for (let i = 0; i < bloomFramebuffers.length; i++) {
        const dest = bloomFramebuffers[i];
        gl.uniform2f(bloomBlurProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
        gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0));
        gl.viewport(0, 0, dest.width, dest.height);
        blit(dest.fbo);
        last = dest;
      }

      gl.blendFunc(gl.ONE, gl.ONE);
      gl.enable(gl.BLEND);

      for (let i = bloomFramebuffers.length - 2; i >= 0; i--) {
        const baseTex = bloomFramebuffers[i];
        gl.uniform2f(bloomBlurProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
        gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0));
        gl.viewport(0, 0, baseTex.width, baseTex.height);
        blit(baseTex.fbo);
        last = baseTex;
      }

      gl.disable(gl.BLEND);
      bloomFinalProgram.bind();
      gl.uniform2f(bloomFinalProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
      gl.uniform1i(bloomFinalProgram.uniforms.uTexture, last.attach(0));
      gl.uniform1f(bloomFinalProgram.uniforms.intensity, config.BLOOM_INTENSITY);
      gl.viewport(0, 0, destination.width, destination.height);
      blit(destination.fbo);
    }

    function applySunrays(source: FBO, mask: FBO, destination: FBO): void {
      gl.disable(gl.BLEND);
      sunraysMaskProgram.bind();
      gl.uniform1i(sunraysMaskProgram.uniforms.uTexture, source.attach(0));
      gl.viewport(0, 0, mask.width, mask.height);
      blit(mask.fbo);

      sunraysProgram.bind();
      gl.uniform1f(sunraysProgram.uniforms.weight, config.SUNRAYS_WEIGHT);
      gl.uniform1i(sunraysProgram.uniforms.uTexture, mask.attach(0));
      gl.viewport(0, 0, destination.width, destination.height);
      blit(destination.fbo);
    }

    function blurTarget(target: FBO, temp: FBO, iterations: number): void {
      blurProgram.bind();
      for (let i = 0; i < iterations; i++) {
        gl.uniform2f(blurProgram.uniforms.texelSize, target.texelSizeX, 0.0);
        gl.uniform1i(blurProgram.uniforms.uTexture, target.attach(0));
        blit(temp.fbo);

        gl.uniform2f(blurProgram.uniforms.texelSize, 0.0, target.texelSizeY);
        gl.uniform1i(blurProgram.uniforms.uTexture, temp.attach(0));
        blit(target.fbo);
      }
    }

    function drawColor(fbo: WebGLFramebuffer | null, color: { r: number; g: number; b: number }): void {
      colorProgram.bind();
      gl.uniform4f(colorProgram.uniforms.color, color.r, color.g, color.b, 1);
      blit(fbo);
    }

    function drawCheckerboard(fbo: WebGLFramebuffer | null): void {
      checkerboardProgram.bind();
      gl.uniform1f(checkerboardProgram.uniforms.aspectRatio, canvas.width / canvas.height);
      blit(fbo);
    }

    function drawDisplay(fbo: WebGLFramebuffer | null, width: number, height: number): void {
      displayMaterial.bind();
      if (config.SHADING) {
        gl.uniform2f(displayMaterial.uniforms.texelSize, 1.0 / width, 1.0 / height);
      }
      gl.uniform1i(displayMaterial.uniforms.uTexture, dye!.read.attach(0));
      if (config.BLOOM) {
        gl.uniform1i(displayMaterial.uniforms.uBloom, bloom!.attach(1));
        gl.uniform1i(displayMaterial.uniforms.uDithering, ditheringTexture.attach(2));
        const scale = getTextureScale(ditheringTexture, width, height);
        gl.uniform2f(displayMaterial.uniforms.ditherScale, scale.x, scale.y);
      }
      if (config.SUNRAYS) {
        gl.uniform1i(displayMaterial.uniforms.uSunrays, sunrays!.attach(3));
      }
      blit(fbo);
    }

    function getTextureScale(
      texture: { width: number; height: number },
      width: number,
      height: number
    ): { x: number; y: number } {
      return {
        x: width / texture.width,
        y: height / texture.height,
      };
    }

    function render(target: FBO | null): void {
      if (config.BLOOM) {
        applyBloom(dye!.read, bloom!);
      }
      if (config.SUNRAYS) {
        applySunrays(dye!.read, dye!.write, sunrays!);
        blurTarget(sunrays!, sunraysTemp!, 1);
      }

      if (target == null || !config.TRANSPARENT) {
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);
      } else {
        gl.disable(gl.BLEND);
      }

      const width = target == null ? gl.drawingBufferWidth : target.width;
      const height = target == null ? gl.drawingBufferHeight : target.height;
      gl.viewport(0, 0, width, height);

      const fbo = target == null ? null : target.fbo;
      if (!config.TRANSPARENT) {
        drawColor(fbo, normalizeColor(config.BACK_COLOR));
      }
      if (target == null && config.TRANSPARENT) {
        drawCheckerboard(fbo);
      }
      drawDisplay(fbo, width, height);
    }

    // ==================== Update Keywords ====================

    function updateKeywords(): void {
      const displayKeywords: string[] = [];
      if (config.SHADING) displayKeywords.push('SHADING');
      if (config.BLOOM) displayKeywords.push('BLOOM');
      if (config.SUNRAYS) displayKeywords.push('SUNRAYS');
      displayMaterial.setKeywords(displayKeywords);
    }

    // ==================== Main Loop ====================

    let lastUpdateTime = Date.now();
    let colorUpdateTimer = 0.0;
    let animationID: number | null = null;
    let isActive = active;

    function calcDeltaTime(): number {
      const now = Date.now();
      let dt = (now - lastUpdateTime) / 1000;
      dt = Math.min(dt, 0.016666);
      lastUpdateTime = now;
      return dt;
    }

    function resizeCanvas(): boolean {
      const width = scaleByPixelRatio(canvas.clientWidth);
      const height = scaleByPixelRatio(canvas.clientHeight);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        return true;
      }
      return false;
    }

    function updateColors(dt: number): void {
      if (!config.COLORFUL) return;

      colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
      if (colorUpdateTimer >= 1) {
        colorUpdateTimer = wrap(colorUpdateTimer, 0, 1);
        for (const p of pointers) {
          p.color = generateColor();
        }
      }
    }

    function applyInputs(): void {
      if (splatStack.length > 0) {
        multipleSplats(splatStack.pop()!);
      }

      for (const p of pointers) {
        if (p.moved) {
          p.moved = false;
          splatPointer(p);
        }
      }
    }

    function update(): void {
      if (!isActive) return;

      const dt = calcDeltaTime();
      if (resizeCanvas()) {
        initFramebuffers();
      }
      updateColors(dt);
      applyInputs();
      if (!config.PAUSED) {
        step(dt);
      }
      render(null);
      animationID = requestAnimationFrame(update);
    }

    // ==================== Event Handlers ====================

    function onMouseDown(e: MouseEvent): void {
      const posX = scaleByPixelRatio(e.pageX);
      const posY = scaleByPixelRatio(e.pageY);
      let pointer = pointers.find((p) => p.id === -1);
      if (pointer == null) {
        pointer = {
          id: -1,
          texcoordX: 0,
          texcoordY: 0,
          prevTexcoordX: 0,
          prevTexcoordY: 0,
          deltaX: 0,
          deltaY: 0,
          down: false,
          moved: false,
          color: generateColor(),
        };
        pointers.push(pointer);
      }
      updatePointerDownData(pointer, -1, posX, posY);
    }

    function onMouseMove(e: MouseEvent): void {
      const pointer = pointers[0];
      if (!pointer.down) return;
      const posX = scaleByPixelRatio(e.pageX);
      const posY = scaleByPixelRatio(e.pageY);
      updatePointerMoveData(pointer, posX, posY);
    }

    function onMouseUp(): void {
      updatePointerUpData(pointers[0]);
    }

    function onTouchStart(e: TouchEvent): void {
      e.preventDefault();
      const touches = e.targetTouches;
      while (touches.length >= pointers.length) {
        pointers.push({
          id: -1,
          texcoordX: 0,
          texcoordY: 0,
          prevTexcoordX: 0,
          prevTexcoordY: 0,
          deltaX: 0,
          deltaY: 0,
          down: false,
          moved: false,
          color: generateColor(),
        });
      }
      for (let i = 0; i < touches.length; i++) {
        const posX = scaleByPixelRatio(touches[i].pageX);
        const posY = scaleByPixelRatio(touches[i].pageY);
        updatePointerDownData(pointers[i + 1], touches[i].identifier, posX, posY);
      }
    }

    function onTouchMove(e: TouchEvent): void {
      e.preventDefault();
      const touches = e.targetTouches;
      for (let i = 0; i < touches.length; i++) {
        const pointer = pointers[i + 1];
        if (!pointer.down) continue;
        const posX = scaleByPixelRatio(touches[i].pageX);
        const posY = scaleByPixelRatio(touches[i].pageY);
        updatePointerMoveData(pointer, posX, posY);
      }
    }

    function onTouchEnd(e: TouchEvent): void {
      const touches = e.changedTouches;
      for (let i = 0; i < touches.length; i++) {
        const pointer = pointers.find((p) => p.id === touches[i].identifier);
        if (pointer == null) continue;
        updatePointerUpData(pointer);
      }
    }

    function onKeyDown(e: KeyboardEvent): void {
      if (e.code === 'KeyP') {
        config.PAUSED = !config.PAUSED;
      }
      if (e.key === ' ') {
        splatStack.push(parseInt(String(Math.random() * 20)) + 5);
      }
    }

    function onResize(): void {
      if (resizeCanvas()) {
        initFramebuffers();
      }
    }

    // ==================== Initialize & Start ====================

    resizeCanvas();
    updateKeywords();
    initFramebuffers();
    multipleSplats(parseInt(String(Math.random() * 20)) + 5);

    // Bind events
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);

    // Start animation
    isActive = active;
    if (isActive) {
      lastUpdateTime = Date.now();
      animationID = requestAnimationFrame(update);
    }

    if (onReady) {
      onReady();
    }

    // ==================== Cleanup ====================

    return () => {
      isActive = false;
      if (animationID !== null) {
        cancelAnimationFrame(animationID);
        animationID = null;
      }

      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [active, onReady]);

  // Handle active prop changes
  useEffect(() => {
    // This effect is handled by the main effect re-running when active changes.
    // The main effect will clean up and re-initialize.
  }, [active]);

  if (!active) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
    />
  );
}
