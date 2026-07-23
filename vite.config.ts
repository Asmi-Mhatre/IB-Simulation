import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The production build is served from https://asmi-mhatre.github.io/IB-Simulation/,
// so assets must resolve under that sub-path. Local dev/preview stay at "/".
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/IB-Simulation/" : "/",
  plugins: [react()],
  server: { port: 5173 },
}));
