import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CareerTrack",
    short_name: "CareerTrack",
    description: "Autonomous AI-Powered Career Operating System",
    start_url: "/discovery",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#533AFD",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
    share_target: {
      action: "/discovery",
      method: "GET",
      params: {
        title: "share_title",
        text: "share_text",
        url: "share_url",
      },
    },
  }
}
