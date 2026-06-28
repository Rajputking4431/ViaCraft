import iconUrl from "@/assets/viacraft-icon.png";
import logoUrl from "@/assets/viacraft-logo.png";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  variant?: "horizontal" | "vertical" | "icon";
}

export function Logo({ 
  className = "", 
  iconOnly = false,
  variant = "horizontal"
}: LogoProps) {
  const isIcon = iconOnly || variant === "icon";

  if (isIcon) {
    return (
      <div 
        className={`h-9 w-9 overflow-hidden flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-200/40 shrink-0 ${className}`}
      >
        <img 
          src={iconUrl} 
          alt="ViaCraft Icon" 
          className="h-full w-full object-contain select-none" 
        />
      </div>
    );
  }

  if (variant === "vertical") {
    return (
      <div className={`flex flex-col items-center select-none bg-white p-4 rounded-2xl shadow-sm border border-slate-200/40 ${className}`}>
        <img 
          src={logoUrl} 
          alt="ViaCraft Logo" 
          className="h-28 w-auto object-contain"
        />
      </div>
    );
  }

  // Horizontal variant (default for headers, footers, sidebars)
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Icon App-style Circular Tile */}
      <div 
        className="h-9 w-9 overflow-hidden flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-200/40 shrink-0"
      >
        <img 
          src={iconUrl} 
          alt="ViaCraft Icon" 
          className="h-full w-full object-contain select-none" 
        />
      </div>
      {/* Stylized Text */}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-baseline font-sans text-lg tracking-wide">
          <span className="font-extrabold text-[#2B125B] dark:text-white">
            VIA
          </span>
          <span 
            className="font-black ml-0.5"
            style={{ 
              background: 'linear-gradient(to right, #9333EA, #EC4899, #F97316)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent'
            }}
          >
            CRAFT
          </span>
        </div>
        <span className="text-[6px] uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500 mt-1.5 font-sans font-bold">
          PRESERVE MEMORIES FOREVER
        </span>
      </div>
    </div>
  );
}
