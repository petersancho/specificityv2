export const geometryFragmentShader = `
precision mediump float;

uniform vec3 lightPosition;
uniform vec3 lightColor;
uniform vec3 ambientColor;
uniform vec3 materialColor;
uniform vec3 selectionHighlight;
uniform float isSelected;
uniform float opacity;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(lightPosition - vPosition);
  float diff = max(dot(normal, lightDir), 0.0);
  
  vec3 ambient = ambientColor * materialColor;
  vec3 diffuse = diff * lightColor * materialColor;
  vec3 color = ambient + diffuse;
  
  color += selectionHighlight * isSelected;
  
  gl_FragColor = vec4(color, opacity);
}
`;
