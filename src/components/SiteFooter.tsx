import { Logo } from "./Logo";
import { Instagram, Facebook, ChevronDown, Mail } from "lucide-react";
import React, { useState } from "react";
import { Link } from "@tanstack/react-router";

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    {...props}
  >
    <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z" />
  </svg>
);

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    {...props}
  >
    <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
  </svg>
);

export function SiteFooter() {
  const [expandedCols, setExpandedCols] = useState<Record<string, boolean>>({});

  const toggleCol = (title: string) => {
    setExpandedCols((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const cols = [
    {
      title: "Shop",
      links: ["Jewelry", "Keychains", "Coasters", "Home Decor", "Wedding Keepsakes"],
    },
    {
      title: "Services",
      links: [
        "Bouquet Preservation",
        "Pet Memories",
        "Baby Memories",
        "Custom Orders",
        "Corporate Gifts",
      ],
    },
    {
      title: "Marketplace",
      links: ["Become a Seller", "Vendor Directory", "Artisan Stories", "Affiliate", "Wholesale"],
    },
    { title: "Company", links: ["About", "Blog", "Contact", "FAQ", "Press"] },
  ];

  return (
    <footer className="mt-32 border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-6 py-16 grid gap-8 lg:gap-12 lg:grid-cols-6">
        <div className="lg:col-span-2 space-y-4">
          <Logo className="h-12 w-auto" />
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Handcrafted resin art and luxury preservation services. Where memories become heirlooms.
          </p>
          <div className="flex gap-3 pt-2">
            {[
              { icon: Mail, href: "mailto:support@viacraft.com", label: "Email support" },
              { icon: Instagram, href: "#", label: "Instagram" },
              { icon: Facebook, href: "#", label: "Facebook" },
              { icon: XIcon, href: "#", label: "X" },
              { icon: WhatsAppIcon, href: "#", label: "WhatsApp" },
            ].map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                className="h-9 w-9 grid place-items-center rounded-full border border-border hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors"
                aria-label={label}
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        {cols.map((c) => {
          const isExpanded = !!expandedCols[c.title];
          return (
            <div key={c.title} className="border-b border-border/40 lg:border-b-0 pb-4 lg:pb-0">
              <button
                onClick={() => toggleCol(c.title)}
                className="w-full flex items-center justify-between text-left font-display text-base lg:text-lg mb-2 lg:mb-4 lg:pointer-events-none cursor-pointer lg:cursor-default"
              >
                <span>{c.title}</span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 lg:hidden ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>
              <ul
                className={`space-y-2.5 text-sm text-muted-foreground transition-all duration-300 overflow-hidden ${
                  isExpanded
                    ? "max-h-60 opacity-100 mt-2 pointer-events-auto"
                    : "max-h-0 opacity-0 pointer-events-none lg:max-h-none lg:opacity-100 lg:pointer-events-auto"
                }`}
              >
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="hover:text-accent transition-colors">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} ViaCraft. Preserve Memories Forever.</p>
          <div className="flex gap-6">
            <Link to="/legal/$slug" params={{ slug: "privacy-policy" }} className="hover:text-accent">
              Privacy
            </Link>
            <Link to="/legal/$slug" params={{ slug: "terms-and-conditions" }} className="hover:text-accent">
              Terms
            </Link>
            <Link to="/legal/$slug" params={{ slug: "refund-policy" }} className="hover:text-accent">
              Refunds
            </Link>
            <Link to="/legal/$slug" params={{ slug: "shipping-policy" }} className="hover:text-accent">
              Shipping
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
