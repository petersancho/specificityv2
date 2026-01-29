export const pointVertexShader = `
precision mediump float;
attribute vec3 position;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float pointRadius;
uniform float depthBias;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec4 clip = projectionMatrix * viewMatrix * world;
  clip.z -= depthBias * clip.w;
  gl_Position = clip;
  gl_PointSize = pointRadius * 2.0;
}
`;
