import "./styles/global.css";
import { WebGLApp } from "./webgl/WebGLApp";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

const canvas = document.createElement("canvas");
canvas.id = "webgl-root";
root.appendChild(canvas);

const app = new WebGLApp(canvas);
app.start();
