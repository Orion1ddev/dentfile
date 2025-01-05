import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PatientFilter } from "@/components/PatientFilter";
import { PatientCard } from "@/components/PatientCard";
import { PatientFormDialog } from "@/components/PatientFormDialog";
import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";
import { useLanguage } from "@/stores/useLanguage";
import { NavMenu } from "@/components/NavMenu";
import { CalendarView } from "@/components/CalendarView";
import { BackgroundEffect } from "@/components/effects/BackgroundEffect";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

type Patient = Database['public']['Tables']['patients']['Row'];

interface IndexProps {
  view?: "list" | "calendar";
}

const Index = ({ view = "list" }: IndexProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const { data: patients, isLoading, error } = useQuery({
    queryKey: ['patients', searchQuery],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let query = supabase
        .from('patients')
        .select('*, dental_records(*)')
        .eq('user_id', user.id)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Patient[];
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background/95 to-background/80 backdrop-blur-sm">
      <BackgroundEffect />
      <nav className="bg-background/80 backdrop-blur-sm shadow-sm sticky top-0 z-10 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                DentaFile
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="h-8 w-8"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              {view === "list" && <PatientFormDialog mode="create" />}
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {view === "list" && (
            <>
              <PatientFilter
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />

              {isLoading ? (
                <div className="text-center py-12">{t('loading')}</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {patients?.map((patient) => (
                    <PatientCard
                      key={patient.id}
                      patient={patient}
                      onClick={() => navigate(`/patient/${patient.id}`)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {view === "calendar" && <CalendarView />}
        </div>
      </main>
      <NavMenu />
    </div>
  );
};

export default Index;