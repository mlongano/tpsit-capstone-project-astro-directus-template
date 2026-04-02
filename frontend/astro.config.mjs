import { defineConfig } from "astro/config";

export default defineConfig({
  output: "server",

  vite: {
    server: {
      // Necessario per il file watching dentro un container Docker.
      // I bind mount non propagano gli eventi filesystem nativi su
      // macOS e Windows; il polling li rileva controllando i file
      // a intervalli regolari.
      watch: {
        usePolling: true,
        interval: 1000,
      },
    },
  },
});
