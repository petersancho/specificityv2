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
uniform float clearcoatIntensity;
uniform float clearcoatRoughness;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vColor;

vec3 adjustSaturation(vec3 color, float saturation) {
  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  return mix(vec3(gray), color, saturation);
}

// Simple dithering to reduce banding
float random(vec3 scale, float seed) {
  return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
}

void main() {
  vec3 normal = normalize(vNormal);
  
  // Double-sided lighting: flip normal if viewing the back face
  if (!gl_FrontFacing) {
    normal = -normal;
  }

  vec3 lightDir = normalize(lightPosition - vPosition);
  vec3 viewDir = normalize(cameraPosition - vPosition);
  
  // Diffuse with wrap for softer shadows
  float ndl = max(dot(normal, lightDir), 0.0);
  float wrap = 0.4;
  float shade = clamp((ndl + wrap) / (1.0 + wrap), 0.0, 1.0);
  float ambient = clamp(ambientStrength, 0.0, 1.0);
  
  vec3 baseColor = mix(materialColor, vColor, clamp(useVertexColor, 0.0, 1.0));
  baseColor = adjustSaturation(baseColor, 1.1);

  vec3 diffuse = baseColor * (ambient + (1.0 - ambient) * shade) * lightColor;

  // Specular (Blinn-Phong)
  vec3 halfDir = normalize(lightDir + viewDir);
  float specAngle = max(dot(normal, halfDir), 0.0);
  float specular = pow(specAngle, 32.0); // Sharpness
  vec3 specularColor = vec3(0.2) * specular * shade; // Moderate intensity

  // Sheen/Fresnel (Rim light)
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
  vec3 sheenColor = mix(baseColor, vec3(1.0), 0.5); // Whiter sheen
  vec3 rim = sheenColor * (sheenIntensity * fresnel * 2.5);

  // Clearcoat (plastic wrap highlight)
  float coat = clamp(clearcoatIntensity, 0.0, 1.0);
  float rough = clamp(clearcoatRoughness, 0.02, 1.0);
  float coatPower = mix(160.0, 30.0, rough);
  float coatSpec = pow(specAngle, coatPower);
  float coatFresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);
  vec3 coatColor = mix(vec3(1.0), baseColor, 0.08);
  vec3 clearcoat = coatColor * coatSpec * (0.25 + 0.75 * coatFresnel) * coat;
  
  vec3 color = diffuse + specularColor + rim + clearcoat;
  
  vec3 highlightTarget = clamp(color + selectionHighlight, 0.0, 1.0);
  color = mix(color, highlightTarget, clamp(isSelected, 0.0, 1.0));

  // Dithering
  float noise = random(vec3(12.9898, 78.233, 151.7182), 0.0);
  color += (noise - 0.5) / 255.0;

  color = smoothstep(vec3(0.0), vec3(1.0), color);
  color = clamp(color, 0.0, 1.0);
  gl_FragColor = vec4(color, opacity);
}
`;
