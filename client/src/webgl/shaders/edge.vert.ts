export const edgeVertexShader = `
precision highp float;

attribute vec3 position;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float depthBias;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vec4 positionOut = projectionMatrix * viewMatrix * worldPosition;
  positionOut.z -= depthBias * positionOut.w;
  gl_Position = positionOut;
}
`;
