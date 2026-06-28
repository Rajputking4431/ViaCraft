import React, { useState, useEffect, useRef } from "react";
import { useNotifications, DBNotification } from "@/hooks/use-notifications";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-admin";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  Store,
  Star,
  Sparkles,
  Info,
  Calendar,
} from "lucide-react";

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export function NotificationDropdown() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();
  const { user } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();
  
  const [isOpen, setIsOpen] = useState(false);
  const [swinging, setSwinging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Swing bell on new notifications
  useEffect(() => {
    if (unreadCount > 0) {
      setSwinging(true);
      const t = setTimeout(() => setSwinging(false), 1000);
      return () => clearTimeout(t);
    }
  }, [unreadCount]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (notif: DBNotification) => {
    // Mark as read
    if (!notif.is_read) {
      markAsRead(notif.id);
    }
    setIsOpen(false);

    // Redirect depending on role and target
    if (role === "admin") {
      if (notif.notification_type.includes("vendor")) {
        navigate({ to: "/admin/vendors" });
      } else {
        navigate({ to: "/admin/orders" });
      }
    } else if (role === "vendor") {
      navigate({ to: "/vendor/dashboard" });
    } else {
      navigate({ to: "/dashboard" });
    }
  };

  const getNotificationIcon = (type: string) => {
    const className = "h-4 w-4 shrink-0";
    switch (type) {
      case "order_placed":
      case "new_order":
      case "new_order_received":
      case "vendor_new_order":
      case "order_accepted":
        return <ShoppingBag className={`${className} text-indigo-500`} />;
      case "order_shipped":
        return <ShoppingBag className={`${className} text-indigo-500 animate-pulse`} />;
      case "order_delivered":
      case "order_completed":
      case "store_approved":
        return <CheckCircleIcon className={`${className} text-emerald-500`} />;
      case "payment_success":
      case "payment_received":
      case "refund_completed":
        return <CreditCard className={`${className} text-amber-500`} />;
      case "low_stock":
      case "store_suspended":
      case "high_value_order":
        return <AlertTriangle className={`${className} text-rose-500`} />;
      case "new_vendor_registration":
      case "new_product_approval":
        return <Store className={`${className} text-violet-500`} />;
      case "new_review":
        return <Star className={`${className} text-yellow-500 fill-yellow-500/20`} />;
      case "preservation_stage_update":
        return <Sparkles className={`${className} text-amber-500`} />;
      default:
        return <Bell className={`${className} text-slate-400`} />;
    }
  };

  const handleViewAllClick = () => {
    setIsOpen(false);
    if (role === "admin") {
      navigate({ to: "/admin/orders" });
    } else if (role === "vendor") {
      navigate({ to: "/vendor/dashboard" });
    } else {
      navigate({ to: "/dashboard" });
    }
  };

  if (!user) return null;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex flex-col items-center hover:text-accent transition-colors group px-1 sm:px-2 cursor-pointer text-center outline-none"
        aria-label="Toggle notifications dropdown"
      >
        <div className="relative">
          <Bell
            className={`h-5 w-5 stroke-[1.8] text-[#5a4331] group-hover:text-accent transition-transform duration-500 ${
              swinging ? "origin-top animate-bell-swing" : ""
            }`}
          />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-rose-500 text-[8px] text-white grid place-items-center font-bold animate-in zoom-in duration-300">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-semibold text-[#5a4331] group-hover:text-accent mt-1 hidden sm:block">
          Alerts
        </span>
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-card border border-border shadow-luxe rounded-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            
            {notifications.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => markAllAsRead()}
                  className="text-[10px] font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3 w-3" /> Mark all read
                </button>
                <span className="text-border">|</span>
                <button
                  onClick={() => clearAll()}
                  className="text-[10px] font-semibold text-muted-foreground hover:text-destructive hover:underline flex items-center gap-1 cursor-pointer"
                  title="Clear history"
                >
                  <Trash2 className="h-3 w-3" /> Clear
                </button>
              </div>
            )}
          </div>

          {/* List */}
          <div className="max-h-[350px] overflow-y-auto divide-y divide-border/60">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="h-12 w-12 rounded-full bg-muted/40 grid place-items-center mx-auto mb-3 text-muted-foreground">
                  <Bell className="h-6 w-6 stroke-[1.5]" />
                </div>
                <p className="font-bold text-xs text-foreground">All caught up!</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  You don't have any notifications right now.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 flex gap-3.5 transition-colors cursor-pointer text-left relative group ${
                    notif.is_read ? "hover:bg-muted/30" : "bg-accent/5 hover:bg-accent/10"
                  }`}
                >
                  {/* Left Icon */}
                  <div className="h-8 w-8 rounded-full bg-muted grid place-items-center shrink-0 border border-border/50">
                    {getNotificationIcon(notif.notification_type)}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`text-xs truncate ${notif.is_read ? "font-semibold text-foreground/90" : "font-bold text-foreground"}`}>
                        {notif.title}
                      </p>
                      <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                        {formatTimeAgo(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                  </div>

                  {/* Actions (Mark as Read / Delete) */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-gradient-to-l from-card via-card pl-4">
                    {!notif.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notif.id);
                        }}
                        className="p-1 rounded-md bg-muted hover:bg-accent/15 hover:text-accent transition-colors"
                        title="Mark as read"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif.id);
                      }}
                      className="p-1 rounded-md bg-muted hover:bg-destructive/15 hover:text-destructive transition-colors"
                      title="Delete notification"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Unread indicator dot */}
                  {!notif.is_read && (
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-accent" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-border bg-muted/20 text-center">
              <button
                onClick={handleViewAllClick}
                className="text-[11px] font-bold text-accent hover:underline w-full py-1 cursor-pointer"
              >
                View all activities
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
