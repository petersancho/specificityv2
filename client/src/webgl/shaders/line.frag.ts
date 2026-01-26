export const lineFragmentShader = `
precision mediump float;

uniform vec3 lineColor;
uniform vec3 selectionHighlight;
uniform float isSelected;
varying float vSide;

void main() {
  float alpha = 1.0 - smoothstep(0.8, 1.0, abs(vSide));
  
  vec3 color = lineColor + selectionHighlight * isSelected;
  gl_FragColor = vec4(color, alpha);
}
`;
