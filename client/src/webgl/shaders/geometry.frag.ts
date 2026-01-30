export const geometryFragmentShader = `
precision highp float;

uniform vec3 lightPosition;
uniform vec3 lightColor;
uniform vec3 ambientColor;
uniform vec3 materialColor;
uniform vec3 cameraPosition;
uniform vec3 selectionHighlight;
uniform float isSelected;
uniform float opacity;
uniform float sheenIntensity;
uniform float ambientStrength;
uniform float useVertexColor;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vColor;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(lightPosition - vPosition);
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float ndl = max(dot(normal, lightDir), 0.0);
  float wrap = 0.3;
  float shade = clamp((ndl + wrap) / (1.0 + wrap), 0.0, 1.0);
  float ambient = clamp(ambientStrength, 0.0, 1.0);
  vec3 baseColor = mix(materialColor, vColor, clamp(useVertexColor, 0.0, 1.0));
  vec3 color = baseColor * (ambient + (1.0 - ambient) * shade) * lightColor;

  // Calm sheen: broad grazing boost, not a specular highlight.
  float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.0);
  color += baseColor * (sheenIntensity * rim);
  
  vec3 highlightTarget = clamp(color + selectionHighlight, 0.0, 1.0);
  color = mix(color, highlightTarget, clamp(isSelected, 0.0, 1.0));

  color = clamp(color, 0.0, 1.0);
  gl_FragColor = vec4(color, opacity);
}
`;
