"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const MONTHS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const DAY_LABELS = ["日","月","火","水","木","金","土"];

function memoKey(y: number, m: number, d: number) { return `${y}-${m}-${d}`; }

function dateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

export default function CalendarPage() {
  const today = new Date();
  const [curYear, setCurYear] = useState(today.getFullYear());
  const [curMonth, setCurMonth] = useState(today.getMonth());
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // modals
  const [loginOpen, setLoginOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [memoInput, setMemoInput] = useState("");
  const [saving, setSaving] = useState(false);

  const pwRef = useRef<HTMLInputElement>(null);
  const memoRef = useRef<HTMLTextAreaElement>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 메모 불러오기 ──
  const fetchMemos = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/memos?year=${y}&month=${m}`);
      const data = await res.json();
      setMemos(data.memos ?? {});
    } catch {
      setMemos({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMemos(curYear, curMonth); }, [curYear, curMonth, fetchMemos]);

  // ── ESC / Ctrl+Enter ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setLoginOpen(false); setMemoOpen(false); }
      if (e.key === "Enter" && e.ctrlKey && memoOpen) handleSaveMemo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── 월 이동 ──
  function changeMonth(dir: number) {
    setCurMonth(prev => {
      let m = prev + dir;
      if (m > 11) { setCurYear(y => y + 1); return 0; }
      if (m < 0)  { setCurYear(y => y - 1); return 11; }
      return m;
    });
  }
  function goToday() { setCurYear(today.getFullYear()); setCurMonth(today.getMonth()); }

  // ── 로그인 ──
  function openLogin() {
    setPwInput(""); setPwError(false); setLoginOpen(true);
    setTimeout(() => pwRef.current?.focus(), 80);
  }
  async function doLogin() {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwInput }),
    });
    if (res.ok) {
      sessionStorage.setItem("cal_pw", pwInput);
      setIsAdmin(true);
      setLoginOpen(false);
    } else {
      setPwError(true);
      setPwInput("");
      pwRef.current?.focus();
    }
  }

  function logout() {
    sessionStorage.removeItem("cal_pw");
    setIsAdmin(false);
  }

  // ── 메모 모달 ──
  function openMemoModal(d: number) {
    if (!isAdmin) return;
    setSelectedDay(d);
    setMemoInput(memos[memoKey(curYear, curMonth, d)] ?? "");
    setMemoOpen(true);
    setTimeout(() => memoRef.current?.focus(), 80);
  }

  async function handleSaveMemo() {
    if (selectedDay === null) return;
    setSaving(true);
    const pw = sessionStorage.getItem("cal_pw") ?? "";
    const res = await fetch("/api/memos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw, date: dateStr(curYear, curMonth, selectedDay), memo: memoInput }),
    });
    if (res.ok) {
      await fetchMemos(curYear, curMonth);
      flashSaved();
      setMemoOpen(false);
      setSelectedDay(null);
    }
    setSaving(false);
  }

  async function handleDeleteMemo() {
    if (selectedDay === null) return;
    setSaving(true);
    const pw = sessionStorage.getItem("cal_pw") ?? "";
    await fetch("/api/memos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw, date: dateStr(curYear, curMonth, selectedDay), memo: "" }),
    });
    await fetchMemos(curYear, curMonth);
    flashSaved();
    setMemoOpen(false);
    setSelectedDay(null);
    setSaving(false);
  }

  function flashSaved() {
    setSavedFlash(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSavedFlash(false), 2000);
  }

  // ── 캘린더 렌더링 ──
  const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
  const firstDay = new Date(curYear, curMonth, 1).getDay();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const remainder = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let i = 0; i < remainder; i++) cells.push(null);

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "24px 12px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        {/* ── 헤더 ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:10 }}>
          <div style={{ fontSize:24, fontWeight:700, color:"#1e293b" }}>
            {curYear}年 {MONTHS[curMonth]}
            <span style={{ fontSize:13, fontWeight:400, color:"#94a3b8", marginLeft:8 }}>スケジュール</span>
          </div>

          <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
            {savedFlash && (
              <span style={{ fontSize:11, color:"#22c55e", fontWeight:500 }}>✓ 保存済み</span>
            )}
            {loading && (
              <span style={{ fontSize:11, color:"#94a3b8" }}>読み込み中...</span>
            )}

            {!isAdmin ? (
              <button onClick={openLogin} style={btnStyle("outline")}>🔒 管理者</button>
            ) : (
              <>
                <span style={{
                  display:"inline-flex", alignItems:"center", gap:5,
                  background:"#fef3c7", color:"#b45309",
                  border:"1.5px solid #fcd34d", borderRadius:20,
                  padding:"4px 12px", fontSize:11, fontWeight:700
                }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:"#f59e0b", display:"inline-block" }} />
                  管理者モード
                </span>
                <button onClick={logout} style={{ background:"#fee2e2", border:"none", borderRadius:8, padding:"6px 12px", fontSize:11, cursor:"pointer", color:"#ef4444", fontWeight:600 }}>
                  ログアウト
                </button>
              </>
            )}

            <button onClick={() => changeMonth(-1)} style={btnStyle("nav")}>‹</button>
            <button onClick={goToday} style={{ ...btnStyle("nav"), fontSize:12 }}>今月</button>
            <button onClick={() => changeMonth(1)} style={btnStyle("nav")}>›</button>
          </div>
        </div>

        {/* ── 캘린더 그리드 ── */}
        <div style={{ background:"white", borderRadius:14, overflow:"hidden", boxShadow:"0 2px 16px rgba(0,0,0,0.07)" }}>
          {/* 요일 헤더 */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", background:"#1e293b" }}>
            {DAY_LABELS.map((d, i) => (
              <div key={d} style={{
                textAlign:"center", padding:"11px 4px", fontSize:12,
                fontWeight:600, letterSpacing:1,
                color: i === 0 ? "#fca5a5" : i === 6 ? "#93c5fd" : "#94a3b8"
              }}>{d}</div>
            ))}
          </div>

          {/* 날짜 칸 */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
            {cells.map((d, i) => {
              if (d === null) {
                return <div key={`e-${i}`} style={{ minHeight:90, borderTop:"1px solid #f1f5f9", borderRight:"1px solid #f1f5f9", background:"#fafafa" }} />;
              }
              const dow = (firstDay + d - 1) % 7;
              const isToday = d === today.getDate() && curMonth === today.getMonth() && curYear === today.getFullYear();
              const memo = memos[memoKey(curYear, curMonth, d)] ?? "";
              return (
                <div
                  key={d}
                  onClick={() => isAdmin && openMemoModal(d)}
                  style={{
                    minHeight: 90,
                    borderTop:"1px solid #f1f5f9",
                    borderRight:"1px solid #f1f5f9",
                    padding:"7px 8px",
                    background:"white",
                    cursor: isAdmin ? "pointer" : "default",
                    transition:"background 0.12s",
                    position:"relative",
                  }}
                  onMouseEnter={e => { if (isAdmin) (e.currentTarget as HTMLDivElement).style.background = "#f0f7ff"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "white"; }}
                >
                  <div style={{
                    fontSize:13,
                    width:24, height:24,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    borderRadius:"50%", marginBottom:4,
                    background: isToday ? "#2563eb" : "transparent",
                    color: isToday ? "white" : dow === 0 ? "#ef4444" : dow === 6 ? "#3b82f6" : "#334155",
                    fontWeight: isToday ? 700 : 500,
                  }}>{d}</div>
                  {memo && (
                    <div style={{ fontSize:11, color:"#374151", lineHeight:1.5, wordBreak:"break-all", whiteSpace:"pre-wrap" }}>
                      {memo}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 열람 전용 힌트 */}
        {!isAdmin && (
          <div style={{ textAlign:"center", padding:10, fontSize:11, color:"#cbd5e1", borderTop:"1px solid #f8fafc", marginTop:4 }}>
            🔒 閲覧専用モード
          </div>
        )}
      </div>

      {/* ── 로그인 모달 ── */}
      {loginOpen && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setLoginOpen(false); }}
          style={modalBgStyle}
        >
          <div style={modalStyle}>
            <div style={{ fontSize:16, fontWeight:700, color:"#1e293b", marginBottom:6 }}>管理者ログイン</div>
            <div style={{ fontSize:12, color:"#94a3b8", marginBottom:20 }}>パスワードを入力してください</div>
            <label style={labelStyle}>パスワード</label>
            <input
              ref={pwRef}
              type="password"
              value={pwInput}
              onChange={e => { setPwInput(e.target.value); setPwError(false); }}
              onKeyDown={e => e.key === "Enter" && doLogin()}
              placeholder="••••••••"
              style={inputStyle}
            />
            {pwError && <div style={{ fontSize:12, color:"#ef4444", marginTop:-10, marginBottom:14 }}>パスワードが違います</div>}
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={doLogin} style={btnPrimary}>ログイン</button>
              <button onClick={() => setLoginOpen(false)} style={btnCancel}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 메모 모달 ── */}
      {memoOpen && selectedDay !== null && (
        <div
          onClick={e => { if (e.target === e.currentTarget) { setMemoOpen(false); setSelectedDay(null); } }}
          style={modalBgStyle}
        >
          <div style={modalStyle}>
            <div style={{ fontSize:16, fontWeight:700, color:"#1e293b", marginBottom:6 }}>
              {curYear}年{curMonth + 1}月{selectedDay}日
            </div>
            <div style={{ fontSize:12, color:"#94a3b8", marginBottom:20 }}>管理者編集モード</div>
            <label style={labelStyle}>メモ・スケジュール</label>
            <textarea
              ref={memoRef}
              value={memoInput}
              onChange={e => setMemoInput(e.target.value)}
              rows={5}
              placeholder={"例：午前 通訳業務\n午後 資料翻訳\n17:00 打合せ"}
              style={{ ...inputStyle, resize:"vertical", marginBottom:18 }}
            />
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={handleSaveMemo} disabled={saving} style={btnPrimary}>
                {saving ? "保存中..." : "保存"}
              </button>
              {(memos[memoKey(curYear, curMonth, selectedDay)] ?? "") && (
                <button onClick={handleDeleteMemo} disabled={saving} style={{ background:"#fee2e2", color:"#ef4444", border:"none", borderRadius:9, padding:"10px 14px", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                  削除
                </button>
              )}
              <button onClick={() => { setMemoOpen(false); setSelectedDay(null); }} style={btnCancel}>キャンセル</button>
            </div>
            <div style={{ fontSize:11, color:"#cbd5e1", marginTop:12, textAlign:"right" }}>Ctrl+Enterで保存</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 스타일 상수 ──
const modalBgStyle: React.CSSProperties = {
  position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", zIndex:200,
  display:"flex", alignItems:"center", justifyContent:"center", padding:16,
};
const modalStyle: React.CSSProperties = {
  background:"white", borderRadius:16, padding:28,
  width:"100%", maxWidth:380,
  boxShadow:"0 20px 60px rgba(0,0,0,0.18)",
};
const labelStyle: React.CSSProperties = {
  display:"block", fontSize:11, fontWeight:600, color:"#94a3b8",
  letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:6,
};
const inputStyle: React.CSSProperties = {
  width:"100%", border:"1.5px solid #e2e8f0", borderRadius:8,
  padding:"10px 12px", fontSize:14, color:"#1e293b",
  outline:"none", marginBottom:16,
  fontFamily:"'Noto Sans KR', sans-serif",
};
const btnPrimary: React.CSSProperties = {
  flex:1, background:"#2563eb", color:"white", border:"none",
  borderRadius:9, padding:10, fontSize:14, fontWeight:700,
  cursor:"pointer", fontFamily:"'Noto Sans KR', sans-serif",
};
const btnCancel: React.CSSProperties = {
  background:"#f1f5f9", color:"#64748b", border:"none",
  borderRadius:9, padding:"10px 14px", fontSize:13, fontWeight:600,
  cursor:"pointer", fontFamily:"'Noto Sans KR', sans-serif",
};

function btnStyle(type: "nav" | "outline"): React.CSSProperties {
  return {
    background:"white", border:"1.5px solid #e2e8f0", borderRadius:8,
    padding: type === "nav" ? "6px 14px" : "6px 14px",
    fontSize: type === "nav" ? 16 : 12,
    cursor:"pointer", color:"#334155", fontWeight:600,
    fontFamily:"'Noto Sans KR', sans-serif",
  };
}
