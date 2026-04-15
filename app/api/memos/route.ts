import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/memos?year=2025&month=4
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  if (!year || !month) {
    return NextResponse.json({ error: "year, month 필요" }, { status: 400 });
  }

  const from = `${year}-${String(Number(month) + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(Number(year), Number(month) + 1, 0).getDate();
  const to = `${year}-${String(Number(month) + 1).padStart(2, "0")}-${lastDay}`;

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("schedules")
    .select("date, memo")
    .gte("date", from)
    .lte("date", to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result: Record<string, string> = {};
  for (const row of data ?? []) {
    const d = new Date(row.date);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    result[key] = row.memo;
  }

  return NextResponse.json({ memos: result });
}

// POST /api/memos — { password, date, memo }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { password, date, memo } = body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "비밀번호가 틀렸습니다" }, { status: 401 });
  }

  const supabase = getAdminClient();

  if (!memo || memo.trim() === "") {
    // 삭제
    const { error } = await supabase.from("schedules").delete().eq("date", date);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: "deleted" });
  }

  // upsert
  const { error } = await supabase
    .from("schedules")
    .upsert({ date, memo: memo.trim() }, { onConflict: "date" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, action: "saved" });
}
