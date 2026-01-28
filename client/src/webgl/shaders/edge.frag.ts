export const edgeFragmentShader = `
precision highp float;

uniform vec3 edgeColor;
uniform float opacity;
uniform float dashEnabled;
uniform float dashScale;

void main() {
  if (dashEnabled > 0.5) {
    float pattern = fract((gl_FragCoord.x + gl_FragCoord.y) * dashScale);
    if (pattern < 0.5) {
      discard;
    }
  }

  gl_FragColor = vec4(edgeColor, opacity);
}
`;
