import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// Depende da sessão do usuário (cookies) a cada requisição.
export const dynamic = "force-dynamic";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/painel" : "/login");
}
