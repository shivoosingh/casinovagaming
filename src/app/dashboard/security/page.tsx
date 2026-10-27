import { SecurityPageClient } from "@/components/dashboard/security-page-client";
import { createClient } from "@/lib/supabase/server";

export default async function SecurityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let phone: string | null = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle();
    phone = data?.phone ?? null;
  }
  // The customer command bot's handle; the card hides itself when unset.
  const telegramBotUsername = process.env.TELEGRAM_CUSTOMER_BOT_USERNAME?.trim() || null;
  return <SecurityPageClient phone={phone} telegramBotUsername={telegramBotUsername} />;
}
