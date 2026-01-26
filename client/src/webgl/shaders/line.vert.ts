export const lineVertexShader = `
attribute vec3 position;
attribute vec3 nextPosition;
attribute float side;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float lineWidth;
uniform vec2 resolution;
varying float vSide;

void main() {
  vec4 currentProj = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  vec4 nextProj = projectionMatrix * viewMatrix * modelMatrix * vec4(nextPosition, 1.0);
  
  vec2 currentScreen = currentProj.xy / currentProj.w * resolution;
  vec2 nextScreen = nextProj.xy / nextProj.w * resolution;
  
  vec2 dir = normalize(nextScreen - currentScreen);
  vec2 normal = vec2(-dir.y, dir.x);
  
  vec2 offset = normal * lineWidth * 0.5 * side;
  vec2 finalScreen = currentScreen + offset;
  
  gl_Position = vec4(finalScreen / resolution * currentProj.w, currentProj.z, currentProj.w);
  vSide = side;
}
`;
