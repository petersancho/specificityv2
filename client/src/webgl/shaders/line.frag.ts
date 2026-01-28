export const lineFragmentShader = `
#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif
precision highp float;

uniform vec3 lineColor;
uniform float lineOpacity;
uniform vec3 selectionHighlight;
uniform float isSelected;
varying float vSide;

void main() {
  float dist = abs(vSide);
#ifdef GL_OES_standard_derivatives
  float aa = fwidth(dist) * 1.1;
  float alpha = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, dist);
#else
  float alpha = 1.0 - smoothstep(0.7, 1.0, dist);
#endif
  alpha = pow(alpha, 1.15);
  
  vec3 color = lineColor + selectionHighlight * isSelected;
  gl_FragColor = vec4(color, alpha * lineOpacity);
}
`;
