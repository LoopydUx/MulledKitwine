import {
  Color,
  DoubleSide,
  Matrix4,
  MeshPhysicalMaterial,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector3,
} from 'three';

/**
 * Stylised liquid surface: a flat sheet shaded with fresnel sheen, a specular
 * highlight, gentle simmer movement, and ripples around a pour's landing point.
 * When `clip` is on, fragments outside the saucepan's inner cylinder are discarded,
 * so the same horizontal sheet stays correct while the pan tilts.
 */
export function createLiquidMaterial(options: { deep: string; sheen: string; clip: boolean }): ShaderMaterial {
  return new ShaderMaterial({
    fog: true,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uDeep: { value: new Color(options.deep) },
        uSheen: { value: new Color(options.sheen) },
        uAmberColor: { value: new Color('#c9741c') },
        uTime: { value: 0 },
        uRipple: { value: 0 },
        uRippleAt: { value: new Vector2() },
        uSimmer: { value: 0 },
        uAmber: { value: 0 },
        uClip: { value: options.clip ? 1 : 0 },
        uPanInv: { value: new Matrix4() },
        uRadius: { value: 1 },
        uLight: { value: new Vector3(-0.35, 0.8, 0.5).normalize() },
      },
    ]),
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      #include <fog_pars_vertex>
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uDeep;
      uniform vec3 uSheen;
      uniform vec3 uAmberColor;
      uniform float uTime;
      uniform float uRipple;
      uniform vec2 uRippleAt;
      uniform float uSimmer;
      uniform float uAmber;
      uniform float uClip;
      uniform mat4 uPanInv;
      uniform float uRadius;
      uniform vec3 uLight;
      varying vec3 vWorld;
      #include <fog_pars_fragment>
      void main() {
        if (uClip > 0.5) {
          vec3 local = (uPanInv * vec4(vWorld, 1.0)).xyz;
          if (dot(local.xz, local.xz) > uRadius * uRadius || local.y < 0.0) discard;
        }
        vec2 q = vWorld.xz;
        vec2 toPour = q - uRippleAt;
        float d = length(toPour) + 0.0001;
        // analytic gradient of the ripple and simmer height fields
        float ripple = cos(d * 24.0 - uTime * 6.5) * exp(-d * 3.0) * uRipple;
        vec2 grad = (toPour / d) * ripple * 0.42;
        grad.x += cos(q.x * 7.0 + uTime * 1.1) * sin(q.y * 6.0 - uTime * 0.9) * 0.05 * uSimmer;
        grad.y += sin(q.x * 7.0 + uTime * 1.1) * cos(q.y * 6.0 - uTime * 0.9) * 0.05 * uSimmer;
        grad += vec2(cos((q.x + q.y) * 3.0 + uTime * 0.5), sin((q.x - q.y) * 3.4 - uTime * 0.4)) * 0.012;
        vec3 n = normalize(vec3(-grad.x, 1.0, -grad.y));
        vec3 v = normalize(cameraPosition - vWorld);
        float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        vec3 h = normalize(uLight + v);
        float spec = pow(max(dot(n, h), 0.0), 120.0) * 0.9 + pow(max(dot(n, h), 0.0), 14.0) * 0.1;
        vec3 color = uDeep * (0.75 + 0.5 * max(dot(n, uLight), 0.0));
        color = mix(color, uAmberColor, uAmber * exp(-d * 3.5) * 0.55);
        color += uSheen * (fresnel * 0.55 + spec);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
}

/** Darkened silhouette edges: what clear glass looks like against a bright backdrop. */
export function createGlassEdgeMaterial(color = '#3a2a26', opacity = 0.5, base = 0.03, power = 2.4): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    fog: true,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uColor: { value: new Color(color) },
        uOpacity: { value: opacity },
        uBase: { value: base },
        uPower: { value: power },
      },
    ]),
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      #include <fog_pars_vertex>
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uBase;
      uniform float uPower;
      varying vec3 vNormal;
      varying vec3 vView;
      #include <fog_pars_fragment>
      void main() {
        float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), uPower);
        gl_FragColor = vec4(uColor, rim * uOpacity + uBase);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
}

/**
 * Reflection-only layer for clear glass and film: highlights and environment, nothing else.
 * The canvas is transparent over the page backdrop, so the layer is written as premultiplied
 * light (alpha = brightness). It can only brighten what is behind it, on the page or in a still.
 */
export function createGlassReflectionMaterial(intensity = 1.5, roughness = 0.04, clearcoat = 0): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({
    color: 0x000000,
    roughness,
    metalness: 0,
    ior: 1.52,
    clearcoat,
    clearcoatRoughness: Math.min(roughness, 0.08),
    envMapIntensity: intensity,
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
  });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <fog_fragment>',
        '#ifdef USE_FOG\n  gl_FragColor.rgb *= 1.0 - smoothstep( fogNear, fogFar, vFogDepth );\n#endif',
      )
      .replace(
        '#include <premultiplied_alpha_fragment>',
        'gl_FragColor.a = clamp( max( gl_FragColor.r, max( gl_FragColor.g, gl_FragColor.b ) ), 0.0, 1.0 );',
      );
  };
  return material;
}
