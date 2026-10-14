import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { mergeGuestCartIntoAccount } from "@/api/cart";
import { mergeGuestWishlistIntoAccount } from "@/api/wishlist";

export interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const mergedForUser = useRef<string | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      setLoading(false);

      const userId = s?.user?.id;
      if (userId && mergedForUser.current !== userId) {
        mergedForUser.current = userId;
        try {
          await Promise.all([
            mergeGuestCartIntoAccount(userId),
            mergeGuestWishlistIntoAccount(userId),
          ]);
        } catch (err) {
          console.error("Failed to merge guest cart or wishlist", err);
        }
      }
      if (!userId) {
        mergedForUser.current = null;
      }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setLoading(false);

      const userId = data.session?.user?.id;
      if (userId && mergedForUser.current !== userId) {
        mergedForUser.current = userId;
        try {
          await Promise.all([
            mergeGuestCartIntoAccount(userId),
            mergeGuestWishlistIntoAccount(userId),
          ]);
        } catch (err) {
          console.error("Failed to merge guest cart or wishlist", err);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
