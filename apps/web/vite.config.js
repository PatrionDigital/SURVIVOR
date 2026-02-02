var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig(function (_a) {
    var mode = _a.mode;
    return ({
        plugins: [react()],
        define: {
            // Polyfill for buffer - needed by some web3 dependencies (bn.js)
            global: "globalThis",
        },
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
                "@components": path.resolve(__dirname, "./src/components"),
                "@game": path.resolve(__dirname, "./src/game"),
                "@hooks": path.resolve(__dirname, "./src/hooks"),
                "@stores": path.resolve(__dirname, "./src/stores"),
                "@lib": path.resolve(__dirname, "./src/lib"),
                "@types": path.resolve(__dirname, "./src/types"),
                "@designer": path.resolve(__dirname, "./src/designer"),
            },
        },
        server: {
            port: 5173,
            proxy: {
                "/api": {
                    target: "http://localhost:3001",
                    changeOrigin: true,
                },
            },
        },
        build: {
            outDir: "dist",
            sourcemap: true,
            rollupOptions: {
                input: __assign({ main: path.resolve(__dirname, "index.html") }, (mode === "development" && {
                    designer: path.resolve(__dirname, "designer.html"),
                })),
            },
        },
    });
});
