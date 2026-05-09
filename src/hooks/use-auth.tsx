import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "user";

export type Profile = {
  id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  groupe_scout: string | null;
  region: string | null;
};

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => {
          fetchRole(s.user.id);
          fetchProfile(s.user.id);
        }, 0);
      } else {
        setRole(null);
        setProfile(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        fetchRole(data.session.user.id);
        fetchProfile(data.session.user.id);
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function fetchRole(userId: string) {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (data?.some((r) => r.role === "admin")) setRole("admin");
    else setRole("user");
  }

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("id, prenom, nom, email, groupe_scout, region")
      .eq("id", userId)
      .maybeSingle();
    if (data) setProfile(data as Profile);
  }

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        role,
        loading,
        isAdmin: role === "admin",
        signOut,
        refreshProfile: async () => {
          if (session?.user) await fetchProfile(session.user.id);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}