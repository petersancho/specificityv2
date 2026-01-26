import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const parsePort = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, "..");
  const env = loadEnv(mode, envDir, "");
  const clientPort = parsePort(env.CLIENT_PORT, 5173);
  const serverPort = parsePort(env.SERVER_PORT, 3001);
  const backendTarget = `http://localhost:${serverPort}`;

  return {
    envDir,
    plugins: [
      react(),
      {
        name: "log-dev-server-url",
        configureServer(server) {
          server.httpServer?.once("listening", () => {
            const address = server.httpServer?.address();
            const port =
              typeof address === "object" && address ? address.port : clientPort;
            console.log(`Frontend running at http://localhost:${port}`);
          });
        },
      },
    ],
    server: {
      port: clientPort,
      strictPort: false,
      proxy: {
        "/api": backendTarget,
        "/socket.io": {
          target: backendTarget,
          ws: true,
        },
      },
    },
  };
});
