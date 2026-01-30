import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
var parsePort = function (value, fallback) {
    var parsed = Number.parseInt(value !== null && value !== void 0 ? value : "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var envDir = path.resolve(__dirname, "..");
    var env = loadEnv(mode, envDir, "");
    var clientPort = parsePort(env.CLIENT_PORT, 5173);
    var serverPort = parsePort(env.SERVER_PORT, 3001);
    var backendTarget = "http://localhost:".concat(serverPort);
    return {
        envDir: envDir,
        plugins: [
            react(),
            {
                name: "log-dev-server-url",
                configureServer: function (server) {
                    var _a;
                    (_a = server.httpServer) === null || _a === void 0 ? void 0 : _a.once("listening", function () {
                        var _a;
                        var address = (_a = server.httpServer) === null || _a === void 0 ? void 0 : _a.address();
                        var port = typeof address === "object" && address ? address.port : clientPort;
                        console.log("Frontend running at http://localhost:".concat(port));
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
        test: {
            environment: "node",
        },
    };
});
