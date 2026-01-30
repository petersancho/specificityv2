export const geometryVertexShader = `
attribute vec3 position;
attribute vec3 normal;
attribute vec3 color;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vColor;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vPosition = worldPosition.xyz;
  vColor = color;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;
