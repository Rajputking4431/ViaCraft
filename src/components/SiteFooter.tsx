import { Logo } from "./Logo";
import {
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  ChevronDown,
  Mail,
  Phone,
  Clock,
  MapPin,
  Building,
} from "lucide-react";
import React, { useState } from "react";
import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  const [expandedCols, setExpandedCols] = useState<Record<string, boolean>>({});

  const toggleCol = (title: string) => {
    setExpandedCols((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const cols: {
    title: string;
    links: {
      label: string;
      to: string;
      params?: { slug: string };
      isExternal?: boolean;
      icon?: React.ComponentType<any>;
    }[];
  }[] = [
    {
      title: "Company",
      links: [
        { label: "About Us", to: "/legal/$slug", params: { slug: "about-us" } },
        { label: "Contact Us", to: "/legal/$slug", params: { slug: "contact-us" } },
        { label: "Careers (Coming Soon)", to: "/legal/$slug", params: { slug: "careers" } },
      ],
    },
    {
      title: "Customer Support",
      links: [
        { label: "Help Center", to: "/legal/$slug", params: { slug: "help-center" } },
        { label: "FAQ", to: "/legal/$slug", params: { slug: "faq" } },
        { label: "Shipping Policy", to: "/legal/$slug", params: { slug: "shipping-policy" } },
        { label: "Return & Refund Policy", to: "/legal/$slug", params: { slug: "return-refund-policy" } },
        { label: "Cancellation Policy", to: "/legal/$slug", params: { slug: "cancellation-policy" } },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", to: "/legal/$slug", params: { slug: "privacy-policy" } },
        { label: "Terms & Conditions", to: "/legal/$slug", params: { slug: "terms-and-conditions" } },
        { label: "Cookie Policy", to: "/legal/$slug", params: { slug: "cookie-policy" } },
        { label: "Disclaimer", to: "/legal/$slug", params: { slug: "disclaimer" } },
        { label: "Intellectual Property Policy", to: "/legal/$slug", params: { slug: "intellectual-property-policy" } },
        { label: "Vendor Terms & Conditions", to: "/legal/$slug", params: { slug: "vendor-terms" } },
        { label: "Buyer Protection Policy", to: "/legal/$slug", params: { slug: "buyer-protection-policy" } },
        { label: "Grievance Redressal Policy", to: "/legal/$slug", params: { slug: "grievance-policy" } },
      ],
    },
    {
      title: "Marketplace",
      links: [
        { label: "Become a Seller", to: "/sell" },
        { label: "Seller Guidelines", to: "/legal/$slug", params: { slug: "seller-guidelines" } },
        { label: "Vendor Commission Policy", to: "/legal/$slug", params: { slug: "vendor-commission-policy" } },
      ],
    },
    {
      title: "Social",
      links: [
        { label: "Instagram", to: "https://instagram.com", isExternal: true, icon: Instagram },
        { label: "Facebook", to: "https://facebook.com", isExternal: true, icon: Facebook },
        { label: "LinkedIn", to: "https://linkedin.com", isExternal: true, icon: Linkedin },
        { label: "YouTube", to: "https://youtube.com", isExternal: true, icon: Youtube },
      ],
    },
  ];

  const contactInfo = {
    businessName: "ViaCraft",
    businessType: "Multi Vendor Marketplace",
    email: "support@viacraft.in",
    phone: "+91 98765 43210",
    hours: "Monday–Saturday, 10 AM – 7 PM",
    address: "ViaCraft Office, 4th Floor, Sector 62, Noida, Uttar Pradesh - 201301, India",
  };

  return (
    <footer className="mt-32 border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-6 py-16 grid gap-8 lg:gap-12 lg:grid-cols-6">
        {/* Logo and Contact Info Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <Logo className="h-12 w-auto" />
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Handcrafted resin art and luxury preservation services. Where memories become heirlooms.
            </p>
          </div>

          <div className="border-t border-border/40 pt-6 space-y-4">
            <h4 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
              Contact Information
            </h4>
            <div className="space-y-3 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-start gap-2.5">
                <Building className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">{contactInfo.businessName}</p>
                  <p className="text-xs text-muted-foreground">{contactInfo.businessType}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-accent shrink-0" />
                <a href={`mailto:${contactInfo.email}`} className="hover:text-accent transition-colors">
                  {contactInfo.email}
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-accent shrink-0" />
                <a href={`tel:${contactInfo.phone.replace(/\s+/g, '')}`} className="hover:text-accent transition-colors">
                  {contactInfo.phone}
                </a>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <p>{contactInfo.hours}</p>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <p className="leading-relaxed">{contactInfo.address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Columns */}
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
                    ? "max-h-[350px] opacity-100 mt-2 pointer-events-auto"
                    : "max-h-0 opacity-0 pointer-events-none lg:max-h-none lg:opacity-100 lg:pointer-events-auto"
                }`}
              >
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.isExternal ? (
                      <a
                        href={l.to}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-accent transition-colors inline-flex items-center gap-1.5"
                      >
                        {l.icon && <l.icon className="h-3.5 w-3.5" />}
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        to={l.to}
                        params={l.params}
                        className="hover:text-accent transition-colors"
                      >
                        {l.label}
                      </Link>
                    )}
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
            <Link
              to="/legal/$slug"
              params={{ slug: "privacy-policy" }}
              className="hover:text-accent"
            >
              Privacy
            </Link>
            <Link
              to="/legal/$slug"
              params={{ slug: "terms-and-conditions" }}
              className="hover:text-accent"
            >
              Terms
            </Link>
            <Link
              to="/legal/$slug"
              params={{ slug: "return-refund-policy" }}
              className="hover:text-accent"
            >
              Refunds
            </Link>
            <Link
              to="/legal/$slug"
              params={{ slug: "shipping-policy" }}
              className="hover:text-accent"
            >
              Shipping
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
