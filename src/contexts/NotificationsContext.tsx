import React, { createContext, useContext, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell } from "lucide-react";

export interface DBNotification {
  id: string;
  receiver_id: string;
  receiver_role: "customer" | "vendor" | "admin";
  sender_id: string | null;
  title: string;
  message: string;
  notification_type: string;
  order_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsContextType {
  notifications: DBNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
}

export const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

// Premium double-chime notification sound synthesis (Web Audio API)
const playChimeSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioCtx = new AudioContextClass();
    
    // Tone 1 (D5)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 frequency
    gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start();
    osc1.stop(audioCtx.currentTime + 0.35);

    // Tone 2 (A5) - delayed slightly for chime effect
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.1); // A5 frequency
    gain2.gain.setValueAtTime(0.08, audioCtx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.45);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(audioCtx.currentTime + 0.1);
    osc2.stop(audioCtx.currentTime + 0.45);
  } catch (err) {
    console.warn("Web Audio API not allowed or supported yet:", err);
  }
};

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 1. React Query to fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("receiver_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as DBNotification[]) ?? [];
    },
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // 2. Mutations
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ is_read: true })
        .eq("receiver_id", user!.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      toast.success("All notifications marked as read");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("notifications").delete().eq("receiver_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      toast.success("Notification history cleared");
    },
  });

  // 3. Setup Supabase Realtime subscription
  useEffect(() => {
    if (!user) return;

    // Listen for new insertions targeted to the current user
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as DBNotification;

          // Play premium audio tone
          playChimeSound();

          // Show Toast notification
          toast(newNotif.title, {
            description: newNotif.message,
            icon: <Bell className="h-4 w-4 text-accent fill-accent/10" />,
            duration: 5000,
          });

          // Invalidate queries so components pick up new records
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const markAsRead = (id: string) => markAsReadMutation.mutate(id);
  const markAllAsRead = () => markAllAsReadMutation.mutate();
  const deleteNotification = (id: string) => deleteMutation.mutate(id);
  const clearAll = () => clearAllMutation.mutate();

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
};
