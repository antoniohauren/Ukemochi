import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
	plugins: [
		react(),
		VitePWA({
			registerType: "autoUpdate",
			manifest: {
				name: "Ukemochi Admin",
				short_name: "Admin",
				lang: "pt-BR",
				display: "standalone",
				theme_color: "#b71c1c",
				background_color: "#ffffff",
				icons: [
					{
						src: "icon.svg",
						sizes: "any",
						type: "image/svg+xml",
						purpose: "any",
					},
				],
			},
		}),
	],
	server: {
		host: true, // reachable from phones on the LAN
		port: 5173,
		proxy: {
			"/api": {
				target: process.env.API_URL ?? "http://localhost:3000",
				rewrite: (path) => path.replace(/^\/api/, ""),
			},
		},
	},
});
