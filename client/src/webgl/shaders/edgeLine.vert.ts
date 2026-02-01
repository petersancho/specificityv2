export const edgeLineVertexShader = `
attribute vec3 position;
attribute vec3 prevPosition;
attribute vec3 nextPosition;
attribute float side;
attribute float edgeKind;
attribute vec3 faceNormal1;
attribute vec3 faceNormal2;
attribute float hasFace2;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
uniform vec2 resolution;
uniform vec3 edgeWidths;
uniform float depthBias;
uniform float edgePixelSnap;
uniform float uShowSilhouette;
uniform float uShowCrease;

varying float vSide;
varying float vEdgeKind;
varying float vMiterLen;
varying float vKeep;

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

  vec2 offset = miter * (lineWidth * 0.5 * side) * miterLen;
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

  // Backface culling: edges are visible only when at least one adjacent face is front-facing
  vec3 viewPos = (viewMatrix * modelMatrix * vec4(position, 1.0)).xyz;
  vec3 viewDir = normalize(-viewPos);
  
  vec3 n1 = normalize(normalMatrix * faceNormal1);
  float f1 = step(0.0, dot(n1, viewDir));  // 1.0 if face 1 is front-facing
  
  float f2 = 0.0;
  if (hasFace2 > 0.5) {
    vec3 n2 = normalize(normalMatrix * faceNormal2);
    f2 = step(0.0, dot(n2, viewDir));  // 1.0 if face 2 is front-facing
  }
  
  // Edge visibility by kind and display mode:
  // - INTERNAL (0): Always hidden
  // - CREASE (1): Visible when front-facing AND uShowCrease enabled
  // - SILHOUETTE (2): Visible when front-facing AND uShowSilhouette enabled
  float isSilhouette = step(1.5, edgeKind);
  float isCrease = step(0.5, edgeKind) * (1.0 - isSilhouette);
  float isInternal = 1.0 - step(0.5, edgeKind);
  
  float anyFaceFront = max(f1, f2);
  float keepSilhouette = isSilhouette * anyFaceFront * uShowSilhouette;
  float keepCrease = isCrease * anyFaceFront * uShowCrease;
  
  vKeep = max(keepSilhouette, keepCrease);
  vSide = side;
  vEdgeKind = edgeKind;
  vMiterLen = miterLen;
}
`;
