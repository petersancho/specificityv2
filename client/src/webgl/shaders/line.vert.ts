export const lineVertexShader = `
attribute vec3 position;
attribute vec3 prevPosition;
attribute vec3 nextPosition;
attribute float side;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float lineWidth;
uniform vec2 resolution;
uniform float depthBias;
uniform float linePixelSnap;
varying float vSide;
varying float vMiterLen;

void main() {
  vec4 prevProj = projectionMatrix * viewMatrix * modelMatrix * vec4(prevPosition, 1.0);
  vec4 currentProj = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  vec4 nextProj = projectionMatrix * viewMatrix * modelMatrix * vec4(nextPosition, 1.0);

  vec2 prevScreen = prevProj.xy / prevProj.w * resolution;
  vec2 currentScreen = currentProj.xy / currentProj.w * resolution;
  vec2 nextScreen = nextProj.xy / nextProj.w * resolution;

  vec2 dirA = currentScreen - prevScreen;
  vec2 dirB = nextScreen - currentScreen;
  float lenA = length(dirA);
  float lenB = length(dirB);
  if (lenA < 1e-4) {
    dirA = dirB;
    lenA = lenB;
  }
  if (lenB < 1e-4) {
    dirB = dirA;
    lenB = lenA;
  }
  dirA = lenA < 1e-4 ? vec2(1.0, 0.0) : dirA / lenA;
  dirB = lenB < 1e-4 ? vec2(1.0, 0.0) : dirB / lenB;

  vec2 normalA = vec2(-dirA.y, dirA.x);
  vec2 normalB = vec2(-dirB.y, dirB.x);

  vec2 miter = normalA + normalB;
  float miterLen = length(miter);
  if (miterLen < 1e-4) {
    miter = normalB;
    miterLen = 1.0;
  } else {
    miter /= miterLen;
    miterLen = 1.0 / max(0.2, dot(miter, normalB));
  }

  float limit = 1.6;
  miterLen = min(miterLen, limit);

  vec2 offset = miter * (lineWidth * 0.5 * side) * miterLen;
  vec2 finalScreen = currentScreen + offset;

  if (linePixelSnap > 0.0) {
    vec2 snapped = floor(finalScreen) + vec2(0.5);
    finalScreen = mix(finalScreen, snapped, linePixelSnap);
  }

  vec4 positionOut = vec4(finalScreen / resolution * currentProj.w, currentProj.z, currentProj.w);
  positionOut.z -= depthBias * positionOut.w;
  gl_Position = positionOut;
  vSide = side;
  vMiterLen = miterLen;
}
`;
