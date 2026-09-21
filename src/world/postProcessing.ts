import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GraphicsQuality } from '../types';

/**
 * Custom Red Dead Redemption / Western Color Grading & Cinematic Tone Shader
 *
 * Implements:
 * - Warm sun-bleached desert grading (RDR2 inspired sepia/golden tone curve)
 * - Shadow lift with cool deep-blue/umber split-toning
 * - Subtle filmic lens vignette (subtle dark vignette with warm rim)
 * - Micro film grain (subtle organic 35mm grain to eliminate color banding in the desert sky)
 * - Contrast S-curve preserving dynamic range
 */
export const RDRColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0.0 },
    uTimeOfDay: { value: 12.0 }, // 0..24
    uVignetteIntensity: { value: 0.32 },
    uVignetteRoundness: { value: 0.8 },
    uColorGradingStrength: { value: 0.75 },
    uWarmth: { value: 1.08 },
    uGrainIntensity: { value: 0.022 },
    uGogglesActive: { value: 0.0 },
    uCurseIntensity: { value: 0.0 },
    uResolution: { value: new THREE.Vector2(1920, 1080) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uTimeOfDay;
    uniform float uVignetteIntensity;
    uniform float uVignetteRoundness;
    uniform float uColorGradingStrength;
    uniform float uWarmth;
    uniform float uGrainIntensity;
    uniform float uGogglesActive;
    uniform float uCurseIntensity;
    uniform vec2 uResolution;

    varying vec2 vUv;

    // Fast organic pseudo-random noise for subtle film grain
    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    // ACES Filmic Tone Mapping Curve (Narkowicz fitting)
    // Monotonically maps [0, +inf) HDR luminance smoothly to [0, 1] without chromatic inversion
    vec3 acesFilm(vec3 x) {
      float a = 2.51;
      float b = 0.03;
      float c = 2.43;
      float d = 0.59;
      float e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }

    void main() {
      // 0. Screen-Space Chromatic Aberration & Supernatural Shimmer (Curse of the Lost Dutchman)
      vec4 baseColor;
      if (uCurseIntensity > 0.001) {
        vec2 centerOffset = vUv - vec2(0.5);
        float dist = length(centerOffset);

        // Subtle supernatural shimmering displacement waves
        float shimmerX = sin(vUv.y * 64.0 + uTime * 4.5) * cos(vUv.x * 48.0 - uTime * 3.2);
        float shimmerY = cos(vUv.x * 60.0 + uTime * 4.0) * sin(vUv.y * 54.0 + uTime * 2.8);
        vec2 shimmerOffset = vec2(shimmerX, shimmerY) * (0.0025 * uCurseIntensity);

        // Radial chromatic dispersion (splitting Red and Blue channels towards the screen corners)
        float pulse = 0.90 + 0.10 * sin(uTime * 2.6);
        float spread = (dist * 0.026 + 0.004) * uCurseIntensity * pulse;
        vec2 normDir = normalize(centerOffset + vec2(0.0001));
        vec2 chromaticOffset = normDir * spread;

        vec2 uvR = clamp(vUv + chromaticOffset + shimmerOffset, 0.001, 0.999);
        vec2 uvG = clamp(vUv + shimmerOffset * 0.35, 0.001, 0.999);
        vec2 uvB = clamp(vUv - chromaticOffset - shimmerOffset * 0.65, 0.001, 0.999);

        float r = texture2D(tDiffuse, uvR).r;
        float g = texture2D(tDiffuse, uvG).g;
        float b = texture2D(tDiffuse, uvB).b;
        float a = texture2D(tDiffuse, uvG).a;

        baseColor = vec4(r, g, b, a);
      } else {
        baseColor = texture2D(tDiffuse, vUv);
      }

      vec3 hdr = baseColor.rgb;

      // 1. ACES Filmic Tone Mapping (Converts HDR bloom & light emitters smoothly to SDR without color channel clipping/flipping)
      vec3 col = acesFilm(hdr);

      // 2. Controlled S-curve contrast enhancement strictly in [0, 1] range
      vec3 contrastCol = col * col * (3.0 - 2.0 * col);
      col = mix(col, contrastCol, 0.4);

      // 3. Cinematic Western / RDR2 Desert Grading
      // Golden hour & midday sun response
      float midday = clamp(1.0 - abs(uTimeOfDay - 12.0) / 7.0, 0.0, 1.0);
      float sunset = clamp(1.0 - abs(uTimeOfDay - 18.0) / 2.5, 0.0, 1.0) +
                     clamp(1.0 - abs(uTimeOfDay - 6.0) / 2.5, 0.0, 1.0);
      float night = clamp(abs(uTimeOfDay - 12.0) / 6.0 - 0.5, 0.0, 1.0);

      // Warm desert highlights & umber midtones
      vec3 desertGraded = max(col, vec3(0.0001));
      desertGraded.r = pow(max(desertGraded.r, 0.0001), 0.94) * (1.0 + 0.08 * uWarmth);
      desertGraded.g = pow(max(desertGraded.g, 0.0001), 0.98) * (1.0 + 0.02 * uWarmth);
      desertGraded.b = pow(max(desertGraded.b, 0.0001), 1.05) * 0.92;

      // Subtle shadow split toning: cool indigo in night/deep shadows, warm amber in highlights
      // Crucial: Only tint neutral/cool dark shadows; strictly preserve warm amber light sources, fires, torches, and lanterns
      vec3 shadowTint = mix(vec3(0.18, 0.22, 0.32), vec3(0.35, 0.25, 0.18), midday);
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      float warmHueProtection = clamp((col.r - col.b) * 2.5 + lum * 1.5, 0.0, 1.0);
      float shadowTintWeight = 0.08 * (1.0 - lum) * (1.0 - warmHueProtection);
      desertGraded = mix(desertGraded + shadowTint * shadowTintWeight, desertGraded, lum);

      // Blend graded color with base based on grading strength
      col = mix(col, desertGraded, uColorGradingStrength);

      // Sunset richness boost
      if (sunset > 0.01) {
        col.r += sunset * 0.05 * lum;
        col.g += sunset * 0.015 * lum;
      }

      // 4. Prospector Goggles Optical Peripheral Blur
      // When goggles are active, what is inside the two circular ocular lenses remains razor-sharp and crystal clear.
      // The surrounding peripheral area remains completely accurate to the 3D scene (desert terrain, boulders, mountains, sky),
      // but becomes fuzzy and out-of-focus (optical depth-of-field / peripheral bokeh).
      if (uGogglesActive > 0.005) {
        float aspect = uResolution.x / max(uResolution.y, 1.0);
        float svgAspect = 1000.0 / 600.0; // 1.66667 matching the goggles overlay aspect ratio

        vec2 svgUv;
        if (aspect >= svgAspect) {
          float scale = aspect / svgAspect;
          svgUv.x = (vUv.x - 0.5) * scale + 0.5;
          svgUv.y = vUv.y;
        } else {
          float scale = svgAspect / aspect;
          svgUv.x = vUv.x;
          svgUv.y = (vUv.y - 0.5) * scale + 0.5;
        }

        // Left ocular lens center: (0.32, 0.50), Right ocular lens center: (0.68, 0.50)
        float dX_L = (svgUv.x - 0.32) * svgAspect;
        float dY_L = svgUv.y - 0.50;
        float distL = sqrt(dX_L * dX_L + dY_L * dY_L);

        float dX_R = (svgUv.x - 0.68) * svgAspect;
        float dY_R = svgUv.y - 0.50;
        float distR = sqrt(dX_R * dX_R + dY_R * dY_R);

        float distLens = min(distL, distR);
        float lensRadius = 175.0 / 600.0; // ~0.2917

        float peripheralFuzz = smoothstep(lensRadius - 0.015, lensRadius + 0.045, distLens) * uGogglesActive;

        if (peripheralFuzz > 0.001) {
          vec2 texel = (1.0 / uResolution) * (3.0 + peripheralFuzz * 4.5);
          vec3 blurred = vec3(0.0);
          blurred += texture2D(tDiffuse, vUv + vec2(-1.0, -1.0) * texel).rgb * 0.075;
          blurred += texture2D(tDiffuse, vUv + vec2( 0.0, -1.3) * texel).rgb * 0.12;
          blurred += texture2D(tDiffuse, vUv + vec2( 1.0, -1.0) * texel).rgb * 0.075;
          blurred += texture2D(tDiffuse, vUv + vec2(-1.3,  0.0) * texel).rgb * 0.12;
          blurred += texture2D(tDiffuse, vUv).rgb                           * 0.22;
          blurred += texture2D(tDiffuse, vUv + vec2( 1.3,  0.0) * texel).rgb * 0.12;
          blurred += texture2D(tDiffuse, vUv + vec2(-1.0,  1.0) * texel).rgb * 0.075;
          blurred += texture2D(tDiffuse, vUv + vec2( 0.0,  1.3) * texel).rgb * 0.12;
          blurred += texture2D(tDiffuse, vUv + vec2( 1.0,  1.0) * texel).rgb * 0.075;

          vec3 blurredGraded = acesFilm(blurred);
          // Controlled contrast and subtle desaturation for the out-of-focus peripheral field
          blurredGraded = mix(blurredGraded, vec3(dot(blurredGraded, vec3(0.299, 0.587, 0.114))), 0.12);
          col = mix(col, blurredGraded, peripheralFuzz * 0.90);
        }
      }

      // 5. Cinematic Vignette (Subtle natural camera lens falloff)
      vec2 coord = (vUv - 0.5) * vec2(1.0, uVignetteRoundness);
      float dist = length(coord);
      float vignette = smoothstep(0.75, 0.3, dist * (uVignetteIntensity * 2.2));
      col *= mix(1.0, vignette, uVignetteIntensity);

      // Curse of the Dutchman: Supernatural cold sepia/crimson edge vignette and desaturation
      if (uCurseIntensity > 0.001) {
        float curseEdge = smoothstep(0.32, 0.82, dist) * uCurseIntensity;
        vec3 curseEdgeTint = vec3(0.08, 0.015, 0.02); // eerie dark umber / dried blood
        col = mix(col, curseEdgeTint, curseEdge * 0.45);

        // Slight desaturation as the curse drains warmth
        float l = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(col, vec3(l), uCurseIntensity * 0.16);
      }

      // 6. Subtle 35mm Film Grain (Breaks banding on desert sky gradients & adds physical camera grit)
      float grain = (hash(vUv * 400.0 + fract(uTime * 17.1)) - 0.5) * uGrainIntensity;
      col += grain * (0.6 + 0.4 * lum);

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), baseColor.a);
    }
  `,
};

export interface PostProcessingPipeline {
  composer: EffectComposer;
  bloomPass: UnrealBloomPass;
  colorGradePass: ShaderPass;
  resize: (width: number, height: number) => void;
  update: (
    delta: number,
    timeOfDay: number,
    quality: GraphicsQuality,
    areGogglesActive?: boolean,
    curseIntensity?: number
  ) => void;
  dispose: () => void;
}

/**
 * Initializes the cinematic post-processing pipeline for Three.js.
 * Configured specifically for Western / RDR desert atmospheric lighting.
 */
export function createPostProcessingPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
  initialQuality: GraphicsQuality
): PostProcessingPipeline {
  // Create high-precision render target for HDR tone preservation before color grade
  const renderTarget = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    stencilBuffer: false,
    depthBuffer: true,
  });

  const composer = new EffectComposer(renderer, renderTarget);

  // 1. Base Scene Render Pass
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // 2. Cinematic Unreal Bloom Pass (Atmospheric sun glare, gold glints, lantern/camp-fire halos)
  // Low radius, high smoothness for realistic optical scattering
  const bloomResolution = new THREE.Vector2(width, height);
  const bloomStrength = initialQuality === 'performance' ? 0.22 : 0.38;
  const bloomRadius = 0.45;
  const bloomThreshold = 0.88; // Only hot desert highlights, sun disk, and campfire/gold glints bloom

  const bloomPass = new UnrealBloomPass(bloomResolution, bloomStrength, bloomRadius, bloomThreshold);
  bloomPass.enabled = initialQuality === 'high'; // Only active on explicit high quality mode for peak performance
  composer.addPass(bloomPass);

  // 3. Cinematic RDR Color Grading, Vignette & 35mm Grain Pass
  const colorGradePass = new ShaderPass(RDRColorGradeShader);
  colorGradePass.renderToScreen = true;
  colorGradePass.uniforms.uResolution.value.set(width, height);
  composer.addPass(colorGradePass);

  let totalTime = 0;
  let currentGogglesLerp = 0.0;

  return {
    composer,
    bloomPass,
    colorGradePass,
    resize: (w: number, h: number) => {
      composer.setSize(w, h);
      bloomPass.resolution.set(w, h);
      colorGradePass.uniforms.uResolution.value.set(w, h);
    },
    update: (
      delta: number,
      timeOfDay: number,
      quality: GraphicsQuality,
      areGogglesActive?: boolean,
      curseIntensity?: number
    ) => {
      totalTime += delta;
      colorGradePass.uniforms.uTime.value = totalTime;
      colorGradePass.uniforms.uTimeOfDay.value = timeOfDay;

      // Curse of the Dutchman chromatic aberration & screen-space shimmer
      colorGradePass.uniforms.uCurseIntensity.value = Math.max(0.0, Math.min(1.0, curseIntensity || 0.0));

      // Smooth optical transition into the goggles
      const targetGoggles = areGogglesActive ? 1.0 : 0.0;
      currentGogglesLerp += (targetGoggles - currentGogglesLerp) * Math.min(1.0, delta * 9.0);
      colorGradePass.uniforms.uGogglesActive.value = currentGogglesLerp;

      // Adjust bloom and grade dynamically per quality level
      if (quality === 'performance') {
        bloomPass.enabled = false;
        colorGradePass.uniforms.uGrainIntensity.value = 0.0;
        colorGradePass.uniforms.uVignetteIntensity.value = 0.20;
      } else if (quality === 'balanced') {
        bloomPass.enabled = false; // Keep bloom off on balanced to prevent GPU stall
        colorGradePass.uniforms.uGrainIntensity.value = 0.008;
        colorGradePass.uniforms.uVignetteIntensity.value = 0.25;
      } else {
        // High quality: full cinematic bloom + rich grain
        bloomPass.enabled = true;
        bloomPass.strength = 0.32;
        colorGradePass.uniforms.uGrainIntensity.value = 0.020;
        colorGradePass.uniforms.uVignetteIntensity.value = 0.32;
      }
    },
    dispose: () => {
      renderTarget.dispose();
      composer.renderTarget1?.dispose();
      composer.renderTarget2?.dispose();
      bloomPass.dispose();
    },
  };
}
