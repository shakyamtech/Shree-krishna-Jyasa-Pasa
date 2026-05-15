
import { supabase } from "./src/integrations/supabase/client";

async function check() {
  const { data, error } = await supabase.from("products").select("*").limit(1).maybeSingle();
  console.log("Product columns:", data ? Object.keys(data) : "No data");
  if (error) console.error("Error:", error);
}
check();
