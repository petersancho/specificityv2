export const edgeLineVertexShader = `
attribute vec3 position;
attribute vec3 nextPosition;
attribute float side;
attribute float edgeKind;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec2 resolution;
uniform vec3 edgeWidths;
uniform float depthBias;
uniform float edgePixelSnap;

varying float vSide;
varying float vEdgeKind;

void main() {
  vec4 currentClip = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  vec4 nextClip = projectionMatrix * viewMatrix * modelMatrix * vec4(nextPosition, 1.0);

  vec2 currentNdc = currentClip.xy / currentClip.w;
  vec2 nextNdc = nextClip.xy / nextClip.w;

  vec2 pixelScale = resolution * 0.5;
  vec2 currentScreen = currentNdc * pixelScale;
  vec2 nextScreen = nextNdc * pixelScale;

  vec2 dir = nextScreen - currentScreen;
  float len = length(dir);
  if (len < 1e-5) {
    dir = vec2(1.0, 0.0);
  } else {
    dir /= len;
  }
  // Keep a consistent direction across the segment to avoid quad tapering.
  if (abs(dir.x) < 1e-4) {
    if (dir.y < 0.0) dir = -dir;
  } else if (dir.x < 0.0) {
    dir = -dir;
  }
  vec2 normal = vec2(-dir.y, dir.x);

  float lineWidth = edgeWidths.x;
  if (edgeKind > 1.5) {
    lineWidth = edgeWidths.z;
  } else if (edgeKind > 0.5) {
    lineWidth = edgeWidths.y;
  }

  vec2 offset = normal * lineWidth * 0.5 * side;
  vec2 finalScreen = currentScreen + offset;
  if (edgePixelSnap > 0.0) {
    vec2 snapped = floor(finalScreen) + vec2(0.5);
    finalScreen = mix(finalScreen, snapped, edgePixelSnap);
  }
  vec2 finalNdc = finalScreen / pixelScale;

  vec4 positionOut = vec4(finalNdc * currentClip.w, currentClip.z, currentClip.w);
  positionOut.z -= depthBias * positionOut.w;
  gl_Position = positionOut;

  vSide = side;
  vEdgeKind = edgeKind;
}
`;
