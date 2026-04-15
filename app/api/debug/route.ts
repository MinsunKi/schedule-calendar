import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminPw = process.env.ADMIN_PASSWORD;

  const checks: Record<string, string> = {
    SUPABASE_URL: url ? "✅ 설정됨" : "❌ 없음",
    SUPABASE_ANON_KEY: anonKey ? "✅ 설정됨" : "❌ 없음",
    SUPABASE_SERVICE_ROLE_KEY: serviceKey ? "✅ 설정됨" : "❌ 없음",
    ADMIN_PASSWORD: adminPw ? "✅ 설정됨" : "❌ 없음",
  };

  if (!url || !serviceKey) {
    return NextResponse.json({ checks, table: "건너뜀 (env 없음)", error: null });
  }

  try {
    const supabase = createClient(url, anonKey!);
    const { data, error } = await supabase
      .from("schedules")
      .select("id, date, memo")
      .limit(3);

    return NextResponse.json({
      checks,
      table: error ? `❌ ${error.message}` : `✅ 연결됨 (${data?.length ?? 0}개 행)`,
      sample: data,
      error: error?.message ?? null,
    });
  } catch (e) {
    return NextResponse.json({ checks, table: `❌ 예외: ${String(e)}`, error: String(e) });
  }
}
