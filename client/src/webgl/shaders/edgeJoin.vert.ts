export const edgeJoinVertexShader = `
attribute vec3 position;
attribute vec3 prevPosition;
attribute vec3 nextPosition;
attribute vec2 corner;
attribute float edgeKind;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec2 resolution;
uniform vec3 edgeWidths;
uniform float depthBias;
uniform float edgePixelSnap;

varying float vEdgeKind;
varying float vMiterLen;
varying vec2 vCorner;

void main() {
  vec4 prevClip = projectionMatrix * viewMatrix * modelMatrix * vec4(prevPosition, 1.0);
  vec4 currentClip = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  vec4 nextClip = projectionMatrix * viewMatrix * modelMatrix * vec4(nextPosition, 1.0);

  vec2 pixelScale = resolution * 0.5;
  vec2 prevScreen = (prevClip.xy / prevClip.w) * pixelScale;
  vec2 currentScreen = (currentClip.xy / currentClip.w) * pixelScale;
  vec2 nextScreen = (nextClip.xy / nextClip.w) * pixelScale;

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

  float lineWidth = edgeWidths.x;
  if (edgeKind > 1.5) {
    lineWidth = edgeWidths.z;
  } else if (edgeKind > 0.5) {
    lineWidth = edgeWidths.y;
  }

  float limit = 1.6;
  miterLen = min(miterLen, limit);

  vec2 tangent = vec2(-miter.y, miter.x);
  float patchScale = min(1.0, 1.0 / miterLen);
  vec2 offset = miter * (lineWidth * 0.5 * corner.x) * patchScale
    + tangent * (lineWidth * 0.5 * corner.y) * 0.98;

  vec2 finalScreen = currentScreen + offset;
  if (edgePixelSnap > 0.0) {
    vec2 snapped = floor(finalScreen) + vec2(0.5);
    finalScreen = mix(finalScreen, snapped, edgePixelSnap);
  }
  vec2 finalNdc = finalScreen / pixelScale;

  vec4 positionOut = vec4(finalNdc * currentClip.w, currentClip.z, currentClip.w);
  float biasScale = 1.0;
  if (edgeKind < 0.5) {
    biasScale = 0.55;
  } else if (edgeKind < 1.5) {
    biasScale = 0.8;
  }
  positionOut.z -= depthBias * biasScale * positionOut.w;
  gl_Position = positionOut;

  vEdgeKind = edgeKind;
  vMiterLen = miterLen;
  vCorner = corner;
}
`;
