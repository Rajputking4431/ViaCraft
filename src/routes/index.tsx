import { createFileRoute } from "@tanstack/react-router";
import { Index } from "@/pages/customer/Home";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ViaCraft — Cherish Today, Preserved Forever" },
      {
        name: "description",
        content:
          "Premium flower bouquet preservation, custom resin art keepsakes, and memories preserved by certified independent artisans.",
      },
      { property: "og:title", content: "ViaCraft — Cherish Today, Preserved Forever" },
      {
        property: "og:description",
        content:
          "Preserve your wedding flowers, memorial heirlooms, baby booties, and precious moments in crystal clear museum-grade resin art.",
      },
    ],
  }),
  component: Index,
});
