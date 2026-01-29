export const edgeJoinFragmentShader = `
#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif
precision highp float;

uniform vec3 edgeColorInternal;
uniform vec3 edgeColorCrease;
uniform vec3 edgeColorSilhouette;
uniform vec3 edgeOpacities;
uniform float edgeAAStrength;

varying float vEdgeKind;
varying float vMiterLen;
varying vec2 vCorner;

void main() {
  float dist = max(abs(vCorner.x), abs(vCorner.y));
#ifdef GL_OES_standard_derivatives
  float cornerBoost = clamp((vMiterLen - 1.0) / 0.6, 0.0, 1.0);
  float aaScale = mix(1.0, 0.65, cornerBoost);
  float aa = max(1e-4, fwidth(dist) * edgeAAStrength * aaScale);
  float alpha = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, dist);
#else
  float alpha = 1.0 - smoothstep(0.85, 1.0, dist);
#endif

  vec3 color = edgeColorInternal;
  float opacity = edgeOpacities.x;
  if (vEdgeKind > 1.5) {
    color = edgeColorSilhouette;
    opacity = edgeOpacities.z;
  } else if (vEdgeKind > 0.5) {
    color = edgeColorCrease;
    opacity = edgeOpacities.y;
  }

  gl_FragColor = vec4(color, alpha * opacity);
}
`;
