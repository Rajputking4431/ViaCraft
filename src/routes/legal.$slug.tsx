import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/layouts/PageShell";
import { useState, useEffect, useMemo } from "react";
import { Search, ChevronRight, Download, Printer, ShieldAlert, ArrowLeft, BookOpen, AlertCircle, Sparkles } from "lucide-react";

// Register TanStack Start route
export const Route = createFileRoute("/legal/$slug")({
  component: LegalPortalPage,
});

// Grouped documents for the sidebar navigation
const LEGAL_GROUPS = [
  {
    title: "Core Agreements",
    items: [
      { id: "terms-and-conditions", label: "Terms & Conditions" },
      { id: "privacy-policy", label: "Privacy Policy" },
      { id: "cookie-policy", label: "Cookie Policy" },
      { id: "disclaimer", label: "General Disclaimer" },
    ],
  },
  {
    title: "Buyer & Seller Policies",
    items: [
      { id: "buyer-protection-policy", label: "Buyer Protection Policy" },
      { id: "vendor-terms", label: "Vendor Terms & Conditions" },
      { id: "seller-code-of-conduct", label: "Seller Code of Conduct" },
      { id: "community-guidelines", label: "Community Guidelines" },
    ],
  },
  {
    title: "Orders & Logistics",
    items: [
      { id: "shipping-policy", label: "Shipping Policy" },
      { id: "return-policy", label: "Return Policy" },
      { id: "refund-policy", label: "Refund Policy" },
      { id: "cancellation-policy", label: "Cancellation Policy" },
      { id: "vendor-commission-policy", label: "Vendor Commission Policy" },
    ],
  },
  {
    title: "Legal & Grievance",
    items: [
      { id: "grievance-policy", label: "Grievance Redressal Policy" },
      { id: "intellectual-property-policy", label: "Intellectual Property Policy" },
    ],
  },
  {
    title: "About & Contact",
    items: [
      { id: "about-us", label: "About ViaCraft" },
      { id: "contact-us", label: "Contact Support & Legal" },
    ],
  },
];

// Helper to render markdown line-by-line
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const renderedElements: React.ReactNode[] = [];

  let inList = false;
  let listItems: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let isHeaderRow = false;

  // Utility to parse inline elements like bold and links
  const parseInline = (text: string) => {
    // 1. Bold (**text**)
    let parsedText: (string | React.ReactNode)[] = [text];

    // Bold replacement
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;
    let currentTexts = [...parsedText];
    parsedText = [];

    for (const txt of currentTexts) {
      if (typeof txt !== "string") {
        parsedText.push(txt);
        continue;
      }
      let lastIndex = 0;
      boldRegex.lastIndex = 0;
      while ((match = boldRegex.exec(txt)) !== null) {
        const index = match.index;
        if (index > lastIndex) {
          parsedText.push(txt.substring(lastIndex, index));
        }
        parsedText.push(
          <strong key={`bold-${index}-${match[1]}`} className="font-bold text-foreground">
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < txt.length) {
        parsedText.push(txt.substring(lastIndex));
      }
    }

    // 2. Links ([text](url))
    const linkRegex = /\[(.*?)\]\((.*?)\)/g;
    currentTexts = [...parsedText];
    parsedText = [];

    for (const txt of currentTexts) {
      if (typeof txt !== "string") {
        parsedText.push(txt);
        continue;
      }
      let lastIndex = 0;
      linkRegex.lastIndex = 0;
      while ((match = linkRegex.exec(txt)) !== null) {
        const index = match.index;
        const linkText = match[1];
        const linkUrl = match[2];

        if (index > lastIndex) {
          parsedText.push(txt.substring(lastIndex, index));
        }

        // Check if file link or standard link
        if (linkUrl.startsWith("file://") || linkUrl.startsWith("/") || linkUrl.startsWith("c:")) {
          // Resolve standard slug
          let resolvedSlug = "";
          if (linkUrl.includes("/legal/")) {
            const parts = linkUrl.split("/legal/");
            resolvedSlug = parts[parts.length - 1].replace(".md", "").split("#")[0];
          } else if (linkUrl.includes("legal/")) {
            const parts = linkUrl.split("legal/");
            resolvedSlug = parts[parts.length - 1].replace(".md", "").split("#")[0];
          }

          if (resolvedSlug) {
            parsedText.push(
              <Link
                key={`link-${index}`}
                to="/legal/$slug"
                params={{ slug: resolvedSlug }}
                className="text-amber-700 hover:text-amber-900 font-semibold underline underline-offset-4 decoration-amber-500/30 transition-colors"
              >
                {linkText}
              </Link>
            );
          } else {
            parsedText.push(
              <span key={`link-${index}`} className="font-semibold text-foreground">
                {linkText}
              </span>
            );
          }
        } else {
          parsedText.push(
            <a
              key={`link-${index}`}
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-700 hover:text-amber-900 font-semibold underline underline-offset-4 decoration-amber-500/30 transition-colors"
            >
              {linkText}
            </a>
          );
        }
        lastIndex = linkRegex.lastIndex;
      }
      if (lastIndex < txt.length) {
        parsedText.push(txt.substring(lastIndex));
      }
    }

    return parsedText;
  };

  const flushList = (key: number) => {
    if (listItems.length === 0) return null;
    const items = [...listItems];
    listItems = [];
    inList = false;
    return (
      <ul key={`ul-${key}`} className="list-disc pl-6 mb-6 space-y-2 text-foreground/80 text-[14px]">
        {items.map((item, idx) => (
          <li key={idx} className="marker:text-amber-600/80">
            {parseInline(item)}
          </li>
        ))}
      </ul>
    );
  };

  const flushTable = (key: number) => {
    if (tableRows.length === 0) return null;
    const rows = [...tableRows];
    tableRows = [];
    inTable = false;
    return (
      <div key={`table-wrapper-${key}`} className="overflow-x-auto border border-border/80 rounded-2xl mb-6 shadow-sm">
        <table className="min-w-full divide-y divide-border/60">
          <thead className="bg-muted/40">
            <tr>
              {rows[0].map((headerCell, idx) => (
                <th
                  key={`th-${idx}`}
                  className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-foreground/90 border-r border-border/40 last:border-0"
                >
                  {headerCell.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 bg-card">
            {rows.slice(1).map((row, rowIdx) => (
              <tr key={`row-${rowIdx}`} className="hover:bg-muted/10 transition-colors">
                {row.map((cell, cellIdx) => (
                  <td
                    key={`td-${rowIdx}-${cellIdx}`}
                    className="px-5 py-3.5 text-xs text-foreground/80 border-r border-border/40 last:border-0"
                  >
                    {parseInline(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle Lists
    if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
      if (inTable) {
        renderedElements.push(flushTable(i)!);
      }
      inList = true;
      listItems.push(line.replace(/^\s*[\*\-]\s+/, ""));
      continue;
    } else if (inList && !line.trim().startsWith("* ") && !line.trim().startsWith("- ") && line.trim() !== "") {
      // Continuation of a list item or a new block
      if (line.trim().match(/^\d+\.\s+/)) {
        renderedElements.push(flushList(i)!);
      } else {
        listItems[listItems.length - 1] += "\n" + line.trim();
        continue;
      }
    }

    // Flush List if we moved to non-list element
    if (inList && !line.trim().startsWith("* ") && !line.trim().startsWith("- ")) {
      renderedElements.push(flushList(i)!);
    }

    // Handle Tables
    if (line.trim().startsWith("|")) {
      inTable = true;
      const cells = line.split("|").slice(1, -1);
      // Skip separator row (|---|---|)
      if (cells.every((c) => c.trim().startsWith("-"))) {
        continue;
      }
      tableRows.push(cells);
      continue;
    }

    // Flush Table if we moved to non-table element
    if (inTable && !line.trim().startsWith("|")) {
      renderedElements.push(flushTable(i)!);
    }

    // Handle empty space
    if (line.trim() === "") {
      continue;
    }

    // Headers
    if (line.startsWith("# ")) {
      renderedElements.push(
        <h1 key={i} className="font-display text-2xl sm:text-3xl font-extrabold text-foreground border-b border-border/60 pb-3 mb-6 mt-2">
          {parseInline(line.replace("# ", ""))}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      renderedElements.push(
        <h2 key={i} className="font-display text-lg sm:text-xl font-bold text-foreground mb-4 mt-8 flex items-center gap-2">
          <BookOpen className="h-4.5 w-4.5 text-amber-600/70" />
          {parseInline(line.replace("## ", ""))}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      renderedElements.push(
        <h3 key={i} className="font-display text-sm sm:text-md font-bold text-foreground/90 mb-3 mt-6">
          {parseInline(line.replace("### ", ""))}
        </h3>
      );
    }
    // Blockquote Alerts (> [!IMPORTANT])
    else if (line.trim().startsWith("> [!")) {
      const alertType = line.includes("IMPORTANT")
        ? "important"
        : line.includes("WARNING") || line.includes("CAUTION")
          ? "warning"
          : "note";

      let alertText = "";
      // Read subsequent lines if they are part of blockquote
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith(">")) {
        i++;
        alertText += " " + lines[i].replace(/^\s*>\s*/, "").trim();
      }

      const alertStyles = {
        important: "bg-red-50/50 dark:bg-red-950/10 border-red-500/40 text-red-950 dark:text-red-200",
        warning: "bg-amber-50/50 dark:bg-amber-950/10 border-amber-500/40 text-amber-950 dark:text-amber-200",
        note: "bg-blue-50/50 dark:bg-blue-950/10 border-blue-500/40 text-blue-950 dark:text-blue-200",
      };

      const AlertIcon = alertType === "important" || alertType === "warning" ? ShieldAlert : AlertCircle;

      renderedElements.push(
        <div key={i} className={`flex gap-3.5 p-4 rounded-2xl border mb-6 shadow-xs leading-relaxed ${alertStyles[alertType]}`}>
          <AlertIcon className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm font-medium">
            {parseInline(alertText.trim() || line.replace(/^\s*>\s*\[!.*?\]/, "").trim())}
          </div>
        </div>
      );
    }
    // Ordered Lists (1. Item)
    else if (line.trim().match(/^\d+\.\s+/)) {
      const numMatch = line.trim().match(/^(\d+)\.\s+/);
      const textOnly = line.trim().replace(/^\d+\.\s+/, "");
      renderedElements.push(
        <div key={i} className="flex gap-3 mb-4 pl-2 text-foreground/80 text-[14px]">
          <span className="font-bold text-amber-700/80 min-w-[20px]">{numMatch ? numMatch[1] : "1"}.</span>
          <span className="flex-1">{parseInline(textOnly)}</span>
        </div>
      );
    }
    // Default Paragraph
    else {
      renderedElements.push(
        <p key={i} className="text-foreground/75 leading-relaxed text-[14px] mb-5">
          {parseInline(line)}
        </p>
      );
    }
  }

  // Final flushes
  if (inList) renderedElements.push(flushList(lines.length)!);
  if (inTable) renderedElements.push(flushTable(lines.length)!);

  return <div className="prose-container">{renderedElements}</div>;
}

function LegalPortalPage() {
  const { slug } = Route.useParams() as { slug: string };
  const navigate = useNavigate();
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Auto scroll to top on document change
  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/legal/${slug}.md`)
      .then((res) => {
        if (!res.ok) throw new Error("File not found");
        return res.text();
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [slug]);

  // Current document name helper
  const currentDocName = useMemo(() => {
    for (const group of LEGAL_GROUPS) {
      const item = group.items.find((i) => i.id === slug);
      if (item) return item.label;
    }
    return "Legal Policy";
  }, [slug]);

  // Filter sidebar navigation items based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return LEGAL_GROUPS;
    return LEGAL_GROUPS.map((group) => {
      const items = group.items.filter(
        (item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return { ...group, items };
    }).filter((group) => group.items.length > 0);
  }, [searchQuery]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <PageShell>
      {/* Banner / Header */}
      <div className="bg-gradient-hero border-b border-border/60 py-10 relative overflow-hidden select-none print:hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/15 text-[10px] uppercase tracking-wider font-bold text-accent mb-3">
              <Sparkles className="h-3 w-3" /> Policy & Trust Portal
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-3">
              ViaCraft Help & Legal Center
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Find transparent terms, vendor agreements, buyer protection rules, and shipping conditions modeled after leading online marketplaces.
            </p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-80 h-full bg-radial-gradient opacity-10 blur-3xl pointer-events-none" />
      </div>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-8 select-none print:hidden">
          <Link to="/" className="hover:text-accent font-medium">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-foreground/50">Legal Policy Center</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-semibold">{currentDocName}</span>
        </nav>

        {/* Mobile Selector Dropdown */}
        <div className="lg:hidden mb-6 print:hidden">
          <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1.5 pl-1">
            Browse Legal Policies
          </label>
          <div className="relative">
            <select
              value={slug}
              onChange={(e) => navigate({ to: "/legal/$slug", params: { slug: e.target.value } })}
              className="w-full px-4 py-3 rounded-2xl bg-card border border-border focus:border-accent text-xs font-semibold outline-none cursor-pointer shadow-sm appearance-none"
            >
              {LEGAL_GROUPS.map((group) => (
                <optgroup key={group.title} label={group.title} className="font-bold text-muted-foreground bg-card">
                  {group.items.map((item) => (
                    <option key={item.id} value={item.id} className="text-foreground font-medium">
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
              <ChevronRight className="h-4 w-4 rotate-90" />
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8 items-start">
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block lg:col-span-1 bg-card border border-border/80 rounded-3xl p-5 space-y-6 sticky top-24 shadow-sm print:hidden">
            <div>
              <div className="relative">
                <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search policies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-background border border-border focus:border-accent outline-none text-xs shadow-inner"
                />
              </div>
            </div>

            <nav className="space-y-5">
              {filteredGroups.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No matching policies found</p>
              ) : (
                filteredGroups.map((group) => (
                  <div key={group.title} className="space-y-1.5">
                    <h3 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/90 pl-3">
                      {group.title}
                    </h3>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const isActive = item.id === slug;
                        return (
                          <Link
                            key={item.id}
                            to="/legal/$slug"
                            params={{ slug: item.id }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all font-medium select-none cursor-pointer ${
                              isActive
                                ? "bg-accent/15 text-accent font-semibold shadow-xs"
                                : "text-foreground/75 hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            <span>{item.label}</span>
                            {isActive && <ChevronRight className="h-3.5 w-3.5" />}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </nav>
          </aside>

          {/* Reader Area */}
          <div className="lg:col-span-3 bg-card border border-border/70 rounded-3xl p-6 sm:p-10 shadow-sm relative print:border-none print:shadow-none print:p-0">
            {/* Quick Actions (Print, Download) */}
            <div className="absolute top-6 sm:top-10 right-6 sm:right-10 flex gap-2 print:hidden">
              <button
                onClick={handlePrint}
                className="p-2 rounded-full border border-border hover:border-accent text-muted-foreground hover:text-accent transition-colors bg-background shadow-xs cursor-pointer"
                title="Print Policy"
              >
                <Printer className="h-4 w-4" />
              </button>
            </div>

            {loading ? (
              <div className="space-y-4 py-8 animate-pulse">
                <div className="h-8 w-1/3 bg-muted rounded-xl" />
                <div className="h-4 w-1/4 bg-muted rounded-xl" />
                <div className="h-px bg-border my-6" />
                <div className="space-y-2.5">
                  <div className="h-4 w-full bg-muted rounded-lg" />
                  <div className="h-4 w-11/12 bg-muted rounded-lg" />
                  <div className="h-4 w-10/12 bg-muted rounded-lg" />
                  <div className="h-4 w-full bg-muted rounded-lg" />
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <ShieldAlert className="h-10 w-10 text-red-500 mx-auto mb-4" />
                <h2 className="font-display text-xl font-bold mb-2">Policy Load Error</h2>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-6">
                  We are unable to load the requested legal policy. Please confirm the link is correct or contact support.
                </p>
                <Link
                  to="/legal/$slug"
                  params={{ slug: "terms-and-conditions" }}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-xs font-semibold shadow hover:bg-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Go to Terms & Conditions
                </Link>
              </div>
            ) : (
              <div className="print:text-black">
                <MarkdownRenderer content={content} />

                {/* Statutory Sign-off footnote */}
                <div className="border-t border-border/60 pt-6 mt-8 text-[11px] text-muted-foreground/90 leading-relaxed print:hidden bg-muted/20 p-4.5 rounded-2xl">
                  <h4 className="font-semibold text-foreground/80 mb-1 flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-accent" /> Legal Review Required
                  </h4>
                  Disclaimer: The documents shown here are generated drafts for the ViaCraft Multi-Vendor Marketplace. Registered users are advised that these guidelines serve as operational directives and should be formally reviewed by an Indian legal practitioner prior to final platform deployment.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
