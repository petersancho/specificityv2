export const pointFragmentShader = `
#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif
precision mediump float;

uniform vec3 fillColor;
uniform vec3 outlineColor;
uniform float pointRadius;
uniform float outlineWidth;
uniform float opacity;

void main() {
  vec2 coord = gl_PointCoord * 2.0 - 1.0;
  float dist = length(coord);
  float safeRadius = max(pointRadius, 0.001);
  float outlineRatio = clamp(outlineWidth / safeRadius, 0.0, 1.0);
  float inner = max(0.0, 1.0 - outlineRatio);
#ifdef GL_OES_standard_derivatives
  float aa = fwidth(dist);
#else
  float aa = max(0.5 / max(pointRadius, 1.0), 0.002);
#endif

  float outerMask = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, dist);
  float innerMask = 1.0 - smoothstep(inner - aa, inner + aa, dist);
  float outlineMask = clamp(outerMask - innerMask, 0.0, 1.0);
  float fillMask = innerMask;
  float alpha = max(outlineMask, fillMask) * opacity;
  if (alpha <= 0.0) discard;

  vec3 color = fillColor * fillMask + outlineColor * outlineMask;
  gl_FragColor = vec4(color, alpha);
}
`;
