import { useState, useRef } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";

const TEACHERS = ["大白老师", "小七老师", "多多老师", "晨晨老师"];
const COZE_API_URL = "/api/coze";
const COZE_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjcwMTQyY2UwLWFiZGQtNDFhMy04Yzk0LWM3NGU5ZGNmNWJiNyJ9.eyJpc3MiOiJodHRwczovL2FwaS5jb3plLmNuIiwiYXVkIjpbIno4dWhaWXh4MGZSbVdaWkRuSmk2eVBRR3JENUp2WE9hIl0sImV4cCI6ODIxMDI2Njg3Njc5OSwiaWF0IjoxNzcyMjQ4MDk1LCJzdWIiOiJzcGlmZmU6Ly9hcGkuY296ZS5jbi93b3JrbG9hZF9pZGVudGl0eS9pZDo3NjExNzM5MDY4NTkzODY0NzE0Iiwic3JjIjoiaW5ib3VuZF9hdXRoX2FjY2Vzc190b2tlbl9pZDo3NjExNzQ3NjExMzk3MDYyNjk0In0.OUo-Sytyr3_wuULWt9SMny-5FsoGIwZzlOuuNw8QuM7E_YfZEbKyjUhfjRokp1nhC7nFVf_-a5S0cBqtUOylDbrn5qosOoIUoNlnvKcAnxTcjYhAm51FxvGVeCiE_s7Wwij3CY-IbV4XVUcuXkE1FnkcdJKSpVxn4RypQxPZfZ_ZFTwdFsfdD6eaNI77sVfYrExaNUDD4tPLXLhT3DIU_Vwxqc_A5Mui9AUUow3iAjc9ZGFWsqgJW_YGl9xDy3pdigxpTUP750PlfK6YzBiwJ5kfBx1sSQtTe9z2-j--Cx5_a3SkeDMlO27h_mshz3yrxVGco-FH0pDJAxilSvmrfQ";

const steps = ["选择信息", "上传文件", "提交成功"];

/** 从 Coze API 响应中解析，支持新版（结构化）和旧版（students+reports） */
function parseCozeOutput(data) {
  if (!data) return null;
  const tryParse = (obj) => {
    if (!obj) return null;
    if (typeof obj === "string") {
      try {
        return JSON.parse(obj);
      } catch {
        return null;
      }
    }
    if (typeof obj === "object" && obj !== null) {
      if (obj.students && obj.reports) return obj;
      if (obj.data?.output) return tryParse(obj.data.output);
      if (obj.output) return tryParse(obj.output);
    }
    return null;
  };
  let parsed = tryParse(data);
  if (!parsed && data.students && data.reports) parsed = data;
  if (!parsed) parsed = tryParse(data.data?.output ?? data.output);
  return parsed;
}

/** 是否为结构化报告（新版） */
function isRichReport(result) {
  if (!result || typeof result !== "object") return false;
  const arr = (v) => Array.isArray(v) && v.length > 0;
  return arr(result.emotionData) || arr(result.moments) || arr(result.knowledgePoints);
}

const STATUS_LABELS = { mastered: "已掌握", learning: "学习中", new: "新内容" };

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: "rgba(255,255,255,0.95)", padding: "8px 12px", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", border: "1px solid #EEE5F5" }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: "#333" }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
}

function RichReport({ result, teacher, files, note, onReset, onBackToQueue }) {
  const [activeTab, setActiveTab] = useState("parent"); // parent | teacher | child
  const isEmpty = !result || (typeof result === "object" && Object.keys(result).length === 0);
  const summary = result?.summary ?? {};
  const reports = result?.reports ?? {};
  const emotionData = Array.isArray(result?.emotionData) ? result.emotionData : [];
  const skillData = Array.isArray(result?.skillData) ? result.skillData : [];
  const moments = Array.isArray(result?.moments) ? result.moments : [];
  const knowledgePoints = Array.isArray(result?.knowledgePoints) ? result.knowledgePoints : [];
  const students = Array.isArray(result?.students) ? result.students : [];

  const briefKeys = { parent: "parentBrief", teacher: "teacherBrief", child: "childBrief" };
  const currentBrief = summary[briefKeys[activeTab]] ?? "";

  const cardStyle = {
    background: "white",
    borderRadius: 14,
    padding: "16px 18px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
    border: "1px solid #EEE5F5",
  };

  const hasAnyContent = summary.date != null || summary.todayScore != null || summary.parentBrief || summary.teacherBrief || summary.childBrief ||
    emotionData.length > 0 || skillData.length > 0 || moments.length > 0 || knowledgePoints.length > 0 || students.length > 0 ||
    reports.parent || reports.teacher || reports.child;

  if (isEmpty || !hasAnyContent) {
    return (
      <div style={{ maxWidth: 860, margin: "0 auto", width: "100%", padding: "12px 0", textAlign: "left" }}>
        <div style={{ fontSize: 48, marginBottom: 12, textAlign: "center", animation: "pop 0.5s ease both" }}>🎉</div>
        <div style={{ fontFamily: "'Nunito'", fontSize: 18, fontWeight: 900, color: "#2D2D3A", marginBottom: 16, textAlign: "center" }}>分析完成</div>
        <div style={{ textAlign: "center", padding: "32px 16px", color: "#BBAACC", fontSize: 14 }}>暂无数据</div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {onBackToQueue && (
            <button onClick={onBackToQueue} style={{
              flex: 1, padding: "13px", borderRadius: 14, border: "1.5px solid #EEE5F5",
              background: "white", color: "#886699", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>← 分析队列</button>
          )}
          <button className="btn-primary" onClick={onReset} style={{
            flex: 1, padding: "13px", borderRadius: 14, border: "none",
            background: "linear-gradient(135deg, #FF6B6B, #FF8E53)",
            color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
            fontFamily: "'Nunito'", boxShadow: "0 4px 16px rgba(255,107,107,0.3)",
          }}>继续上传</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", width: "100%", padding: "12px 0", textAlign: "left" }}>
      <div style={{ fontSize: 48, marginBottom: 12, textAlign: "center", animation: "pop 0.5s ease both" }}>🎉</div>
      <div style={{ fontFamily: "'Nunito'", fontSize: 18, fontWeight: 900, color: "#2D2D3A", marginBottom: 16, textAlign: "center" }}>分析完成</div>

      {/* 1. 摘要卡 */}
      {(summary.date != null || summary.todayScore != null || summary.parentBrief || summary.teacherBrief || summary.childBrief) && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 12 }}>
            {summary.date != null && (
              <span style={{ fontSize: 14, fontWeight: 700, color: "#2D2D3A" }}>{summary.date}</span>
            )}
            {summary.todayScore != null && (
              <span style={{ fontSize: 14, color: "#886699", fontWeight: 600 }}>今日得分 {summary.todayScore}</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {["parent", "teacher", "child"].map(key => {
              const isActive = activeTab === key;
              return (
                <button key={key} onClick={() => setActiveTab(key)} style={{
                  padding: "8px 14px", borderRadius: 10, border: "none",
                  background: isActive ? "linear-gradient(135deg, #FF6B6B, #FF8E53)" : "#FAF5FF",
                  color: isActive ? "white" : "#886699",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Nunito'",
                }}>
                  {key === "parent" ? "家长版" : key === "teacher" ? "老师版" : "孩子版"}
                </button>
              );
            })}
          </div>
          {currentBrief && (
            <div style={{ fontSize: 13, lineHeight: 1.7, color: "#444", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {currentBrief}
            </div>
          )}
        </div>
      )}

      {/* Row 1: 情绪变化 + 关键时刻 */}
      {(emotionData.length > 0 || moments.length > 0) && (
        <div className="rich-grid-row" style={{
          display: "grid",
          gridTemplateColumns: emotionData.length > 0 && moments.length > 0 ? "1.4fr 1fr" : "1fr",
          gap: 16,
          marginBottom: 16,
        }}>
          {emotionData.length > 0 && (
            <div className="rich-grid-cell" style={{ ...cardStyle, minHeight: 0, minWidth: 0 }}>
              <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>📈 情绪变化</div>
              <div style={{ fontSize: 11, color: "#BBAACC", marginBottom: 12 }}>课堂情绪采样</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={emotionData}>
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#bbb" }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="专注度" stroke="#6C63FF" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="积极性" stroke="#FF6584" strokeWidth={2.5} dot={false} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#888" }}>
                  <div style={{ width: 16, height: 2, background: "#6C63FF", borderRadius: 1 }} />专注度
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#888" }}>
                  <div style={{ width: 16, height: 2, borderRadius: 1, borderTop: "2px dashed #FF6584", background: "none" }} />积极性
                </div>
              </div>
            </div>
          )}
          {moments.length > 0 && (
            <div className="rich-grid-cell" style={{ ...cardStyle, minHeight: 0, minWidth: 0 }}>
              <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>⚡ 关键时刻</div>
              <div style={{ fontSize: 11, color: "#BBAACC", marginBottom: 12 }}>AI 捕捉的重要节点</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {moments.map((m, i) => (
                  <div key={i} style={{ padding: "10px 12px", background: "#FAF5FF", borderRadius: 10, border: "1px solid #EEE5F5" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      {m.time != null && <span style={{ fontSize: 11, color: "#BBAACC", fontWeight: 600 }}>{m.time}</span>}
                      {m.type && <span style={{ fontSize: 12, fontWeight: 700, color: "#886699" }}>{m.type}</span>}
                    </div>
                    {m.text && <div style={{ fontSize: 13, lineHeight: 1.6, color: "#444" }}>{m.text}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Row 2: 能力雷达 + 三端报告 */}
      {(skillData.length > 0 || reports.parent || reports.teacher || reports.child) && (
        <div className="rich-grid-row" style={{
          display: "grid",
          gridTemplateColumns: skillData.length > 0 && (reports.parent || reports.teacher || reports.child) ? "1fr 1.4fr" : "1fr",
          gap: 16,
          marginBottom: 16,
        }}>
          {skillData.length > 0 && (
            <div className="rich-grid-cell" style={{ ...cardStyle, minHeight: 0, minWidth: 0 }}>
              <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>🎯 能力雷达</div>
              <div style={{ fontSize: 11, color: "#BBAACC", marginBottom: 8 }}>综合能力评估</div>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={skillData}>
                  <PolarGrid stroke="#f0f0f0" />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: "#888" }} />
                  <Radar dataKey="score" stroke="#6C63FF" fill="#6C63FF" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
          {(reports.parent || reports.teacher || reports.child) && (
            <div className="rich-grid-cell" style={{ ...cardStyle, minHeight: 0, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {TABS.map(({ key, label, icon }) => {
                  const isActive = activeTab === key;
                  const hasContent = reports[key];
                  return (
                    <button key={key} onClick={() => setActiveTab(key)} style={{
                      flex: 1, padding: "10px 8px", borderRadius: 12, border: "none",
                      background: isActive ? "linear-gradient(135deg, #FF6B6B, #FF8E53)" : "#FAF5FF",
                      color: isActive ? "white" : hasContent ? "#886699" : "#CCBBDD",
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                      fontFamily: "'Nunito'",
                    }}>{icon} {label}</button>
                  );
                })}
              </div>
              <div style={{
                background: "#FDFAFF", borderRadius: 12, padding: "14px",
                border: "1px solid #EEE5F5", maxHeight: 240, overflowY: "auto",
                fontSize: 13, lineHeight: 1.7, color: "#444", whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {(reports[activeTab] ?? "") || "暂无内容"}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. 知识点掌握 */}
      {knowledgePoints.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#886699", fontWeight: 700, marginBottom: 10 }}>知识点掌握</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {knowledgePoints.map((kp, i) => (
              <div key={i} style={{ padding: "10px 12px", background: "#FAF5FF", borderRadius: 10, border: "1px solid #EEE5F5" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#444" }}>{kp.name ?? "-"}</span>
                  <span style={{ fontSize: 11, color: "#886699", fontWeight: 600 }}>
                    {STATUS_LABELS[kp.status] ?? kp.status ?? "-"}
                  </span>
                </div>
                {kp.progress != null && (
                  <div style={{ height: 6, background: "#EEE5F5", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", background: "linear-gradient(90deg, #FF6B6B, #FF8E53)",
                      width: `${Math.min(100, Math.max(0, Number(kp.progress) || 0))}%`,
                      borderRadius: 3,
                    }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. 学员概览 */}
      {students.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#886699", fontWeight: 700, marginBottom: 10 }}>学员概览</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {students.map((s, i) => (
              <span key={s.name ? `${s.name}-${i}` : i} style={{
                padding: "6px 12px", borderRadius: 20, background: "#FAF5FF",
                fontSize: 12, color: "#444", border: "1px solid #EEE5F5",
                display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap",
              }}>
                <span>{s.name ?? "-"}</span>
                <span style={{ color: "#BBAACC" }}>· {s.speaking_count ?? "-"} 次</span>
                {(s.performance != null && s.performance !== "") && <span style={{ color: "#886699", fontWeight: 600 }}>· {s.performance}</span>}
                {(s.emotion_trend != null && s.emotion_trend !== "") && <span style={{ color: "#6C63FF", fontSize: 11 }}>· {s.emotion_trend}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 6. 底部按钮 */}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        {onBackToQueue && (
          <button onClick={onBackToQueue} style={{
            flex: 1, padding: "13px", borderRadius: 14, border: "1.5px solid #EEE5F5",
            background: "white", color: "#886699", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>← 分析队列</button>
        )}
        <button className="btn-primary" onClick={onReset} style={{
          flex: onBackToQueue ? 1 : 1, padding: "13px", borderRadius: 14, border: "none",
          background: "linear-gradient(135deg, #FF6B6B, #FF8E53)",
          color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
          fontFamily: "'Nunito'", boxShadow: "0 4px 16px rgba(255,107,107,0.3)",
        }}>继续上传</button>
      </div>
    </div>
  );
}

const toBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result.split(",")[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const TABS = [
  { key: "teacher", label: "老师版", icon: "📋" },
  { key: "parent", label: "家长版", icon: "👨‍👩‍👧" },
  { key: "child", label: "孩子版", icon: "🎮" },
];

const QUEUE_KEY = "classroom_upload_queue";
const MAX_QUEUE = 20;

function loadQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(items) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(0, MAX_QUEUE)));
  } catch { /* ignore */ }
}

function ReportResult({ result, teacher, files, note, onReset, onBackToQueue }) {
  const [activeTab, setActiveTab] = useState("teacher");
  const reports = result?.reports ?? {};
  const students = result?.students ?? [];
  const hasReports = reports.teacher || reports.parent || reports.child;

  if (!hasReports) {
    return (
      <div style={{ textAlign: "center", padding: "16px 0" }}>
        <div style={{ fontSize: 64, marginBottom: 16, animation: "pop 0.5s ease both" }}>🎉</div>
        <div style={{ fontFamily: "'Nunito'", fontSize: 20, fontWeight: 900, color: "#2D2D3A", marginBottom: 8 }}>上传成功！</div>
        <div style={{ fontSize: 13, color: "#BBAACC", lineHeight: 1.7, marginBottom: 24 }}>
          AI 正在分析课堂内容，请稍候查看结果
        </div>
        <div style={{ background: "#FAF5FF", borderRadius: 16, padding: "16px 20px", marginBottom: 24, textAlign: "left" }}>
          <div style={{ fontSize: 12, color: "#886699", fontWeight: 700, marginBottom: 10 }}>本次上传信息</div>
          {[
            { label: "老师", val: teacher },
            { label: "文件数", val: `${files.length} 个` },
            note && { label: "备注", val: note },
          ].filter(Boolean).map(item => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: "1px solid #F0E8FF" }}>
              <span style={{ color: "#BBAACC" }}>{item.label}</span>
              <span style={{ color: "#444", fontWeight: 600 }}>{item.val}</span>
            </div>
          ))}
        </div>
        <button className="btn-primary" onClick={onReset} style={{
          width: "100%", padding: "13px", borderRadius: 14, border: "none",
          background: "linear-gradient(135deg, #FF6B6B, #FF8E53)",
          color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
          fontFamily: "'Nunito'", boxShadow: "0 4px 16px rgba(255,107,107,0.3)",
        }}>继续上传下一节课</button>
      </div>
    );
  }

  const content = reports[activeTab] || "";

  return (
    <div style={{ padding: "12px 0", textAlign: "left" }}>
      <div style={{ fontSize: 48, marginBottom: 12, textAlign: "center", animation: "pop 0.5s ease both" }}>🎉</div>
      <div style={{ fontFamily: "'Nunito'", fontSize: 18, fontWeight: 900, color: "#2D2D3A", marginBottom: 16, textAlign: "center" }}>分析完成</div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {TABS.map(({ key, label, icon }) => {
          const isActive = activeTab === key;
          const hasContent = reports[key];
          return (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              flex: 1, padding: "10px 8px", borderRadius: 12, border: "none",
              background: isActive ? "linear-gradient(135deg, #FF6B6B, #FF8E53)" : "#FAF5FF",
              color: isActive ? "white" : hasContent ? "#886699" : "#CCBBDD",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Nunito'",
            }}>{icon} {label}</button>
          );
        })}
      </div>

      <div style={{
        background: "#FDFAFF", borderRadius: 14, padding: "16px",
        border: "1px solid #EEE5F5", maxHeight: 320, overflowY: "auto",
        fontSize: 13, lineHeight: 1.7, color: "#444", whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>
        {content || "暂无内容"}
      </div>

      {students.length > 0 && (
        <div style={{ marginTop: 14, background: "#FAF5FF", borderRadius: 14, padding: "14px", border: "1px solid #EEE5F5" }}>
          <div style={{ fontSize: 12, color: "#886699", fontWeight: 700, marginBottom: 8 }}>学员概览</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {students.map((s, i) => (
              <span key={i} style={{
                padding: "4px 10px", borderRadius: 20, background: "white",
                fontSize: 12, color: "#444", border: "1px solid #EEE5F5",
              }}>{s.name} · {s.speaking_count ?? "-"} 次 · {s.performance ?? "-"}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        {onBackToQueue && (
          <button onClick={onBackToQueue} style={{
            flex: 1, padding: "13px", borderRadius: 14, border: "1.5px solid #EEE5F5",
            background: "white", color: "#886699", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>← 分析队列</button>
        )}
        <button className="btn-primary" onClick={onReset} style={{
          flex: onBackToQueue ? 1 : 1, padding: "13px", borderRadius: 14, border: "none",
          background: "linear-gradient(135deg, #FF6B6B, #FF8E53)",
          color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
          fontFamily: "'Nunito'", boxShadow: "0 4px 16px rgba(255,107,107,0.3)",
        }}>继续上传</button>
      </div>
    </div>
  );
}

function QueueItem({ item, onView }) {
  const status = item.status;
  const ts = item.ts ? new Date(item.ts).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
  const statusText = status === "completed" ? "已完成" : status === "failed" ? "失败" : "分析中";
  const statusColor = status === "completed" ? "#22c55e" : status === "failed" ? "#ef4444" : "#f59e0b";

  return (
    <div onClick={() => onView(item)} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 14px", borderRadius: 12, background: "#FAF5FF", border: "1px solid #EEE5F5",
      cursor: "pointer", marginBottom: 8,
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#444" }}>{item.teacher || "未知"}</div>
        <div style={{ fontSize: 11, color: "#BBAACC", marginTop: 2 }}>{ts} · {item.filesCount || 0} 个文件</div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: statusColor }}>{statusText}</span>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("upload"); // "upload" | "queue"
  const [step, setStep] = useState(0);
  const [teacher, setTeacher] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [queue, setQueue] = useState(loadQueue);
  const [selectedQueueItem, setSelectedQueueItem] = useState(null); // 从队列点进查看详情
  const fileRef = useRef();

  const canNext = teacher !== "";
  const canSubmit = files.length > 0;

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  };

  const handleFile = (e) => {
    setFiles(prev => [...prev, ...Array.from(e.target.files)]);
  };

  const removeFile = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    const jobId = Date.now().toString();
    const newJob = {
      id: jobId,
      ts: Date.now(),
      teacher,
      filesCount: files.length,
      note: note || "",
      status: "loading",
    };
    const nextQueue = [newJob, ...queue];
    setQueue(nextQueue);
    saveQueue(nextQueue);

    try {
      const textFiles = files.filter(f => f.name.match(/\.(txt|docx|doc)$/i));
      const audioFiles = files.filter(f => f.name.match(/\.(mp3|mp4|m4a|wav)$/i));

      const body = {
        teacher_name: teacher,
        remark: note || "",
      };

      if (textFiles.length > 0) {
        const base64 = await toBase64(textFiles[0]);
        body.transcript_file = {
          url: `data:application/octet-stream;base64,${base64}`,
          file_type: "document",
        };
      }

      if (audioFiles.length > 0) {
        const base64 = await toBase64(audioFiles[0]);
        body.audio_file = {
          url: `data:audio/mpeg;base64,${base64}`,
          file_type: "audio",
        };
      }

      const res = await fetch(COZE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${COZE_TOKEN}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`请求失败: ${res.status}`);
      const json = await res.json();
      if (json.success === false) {
        setError(json.error || json.message || "分析失败，请重试");
        const failedQueue = nextQueue.map(j => j.id === jobId ? { ...j, status: "failed", error: json.error } : j);
        setQueue(failedQueue);
        saveQueue(failedQueue);
        return;
      }
      const parsed = parseCozeOutput(json?.data ?? json);
      const completedQueue = nextQueue.map(j => j.id === jobId ? { ...j, status: "completed", result: parsed } : j);
      setQueue(completedQueue);
      saveQueue(completedQueue);
      setResult(parsed);
      setStep(2);
    } catch (err) {
      setError("提交失败，请重试。错误：" + err.message);
      const failedQueue = nextQueue.map(j => j.id === jobId ? { ...j, status: "failed", error: err.message } : j);
      setQueue(failedQueue);
      saveQueue(failedQueue);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0); setTeacher(""); setNote(""); setFiles([]); setError(""); setResult(null);
  };

  const getFileIcon = (file) => {
    if (file.type.includes("audio") || file.name.match(/\.(mp3|mp4|m4a|wav)$/i)) return "🎙️";
    if (file.name.match(/\.(txt|docx|doc)$/i)) return "📄";
    return "📎";
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #FFF8F0 0%, #FFF0F5 60%, #F5F0FF 100%)",
      fontFamily: "'PingFang SC', 'Noto Sans SC', sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        .btn-primary { transition: all 0.2s; }
        .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(255,107,107,0.35); }
        .btn-primary:active:not(:disabled) { transform: translateY(0); }
        .file-item:hover .remove-btn { opacity: 1; }
        .remove-btn { opacity: 0; transition: opacity 0.2s; }
        .select-opt { transition: all 0.15s; cursor: pointer; }
        .select-opt:hover { background: #FFF0EC !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pop { 0%{transform:scale(0.5);opacity:0;} 60%{transform:scale(1.15);} 100%{transform:scale(1);opacity:1;} }
        @media (max-width: 600px) {
          .rich-grid-row { grid-template-columns: 1fr !important; }
          .rich-grid-cell { min-width: 0; width: 100%; }
        }
      `}</style>

      <div style={{
        width: "100%",
        maxWidth: (step === 2 && isRichReport(result)) || (view === "queue" && selectedQueueItem?.status === "completed" && isRichReport(selectedQueueItem?.result))
          ? 900 : 440,
      }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>🎓</div>
          <div style={{ fontFamily: "'Nunito'", fontSize: 20, fontWeight: 900, color: "#2D2D3A" }}>课堂记录上传</div>
          <div style={{ fontSize: 12, color: "#BBAACC", marginTop: 2 }}>上传完成，系统自动分析处理</div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={() => { setView("upload"); setSelectedQueueItem(null); }} style={{
              padding: "6px 14px", borderRadius: 20, border: "none",
              background: view === "upload" ? "linear-gradient(135deg, #FF6B6B, #FF8E53)" : "#F0EEF5",
              color: view === "upload" ? "white" : "#BBAACC", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>上传</button>
            <button onClick={() => { setView("queue"); setSelectedQueueItem(null); }} style={{
              padding: "6px 14px", borderRadius: 20, border: "none",
              background: view === "queue" ? "linear-gradient(135deg, #FF6B6B, #FF8E53)" : "#F0EEF5",
              color: view === "queue" ? "white" : "#BBAACC", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>分析队列</button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: i < step ? "#FF6B6B" : i === step ? "linear-gradient(135deg, #FF6B6B, #FF8E53)" : "#F0EEF5",
                  color: i <= step ? "white" : "#BBAACC",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700,
                  boxShadow: i === step ? "0 4px 16px rgba(255,107,107,0.4)" : "none",
                  transition: "all 0.3s",
                }}>
                  {i < step ? "✓" : i + 1}
                </div>
                <div style={{ fontSize: 10, color: i === step ? "#FF6B6B" : "#CCBBDD", fontWeight: i === step ? 700 : 400, whiteSpace: "nowrap" }}>
                  {s}
                </div>
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: 60, height: 2, background: i < step ? "#FF6B6B" : "#F0EEF5", margin: "0 4px 18px", transition: "background 0.3s" }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ background: "white", borderRadius: 24, padding: "28px 24px", boxShadow: "0 8px 40px rgba(0,0,0,0.08)" }}>

          {view === "queue" ? (
            selectedQueueItem ? (
              selectedQueueItem.status === "failed" ? (
                <div style={{ padding: "16px 0" }}>
                  <div style={{ fontSize: 48, marginBottom: 12, textAlign: "center" }}>⚠️</div>
                  <div style={{ fontFamily: "'Nunito'", fontSize: 16, fontWeight: 800, color: "#2D2D3A", marginBottom: 8, textAlign: "center" }}>分析失败</div>
                  <div style={{ padding: "12px", background: "#FFF0F0", borderRadius: 12, fontSize: 12, color: "#c44", marginBottom: 16 }}>{selectedQueueItem.error || "未知错误"}</div>
                  <button onClick={() => setSelectedQueueItem(null)} style={{
                    width: "100%", padding: "12px", borderRadius: 14, border: "1.5px solid #EEE5F5",
                    background: "white", color: "#886699", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  }}>← 返回队列</button>
                </div>
              ) : isRichReport(selectedQueueItem.result) ? (
                <RichReport
                  result={selectedQueueItem.result}
                  teacher={selectedQueueItem.teacher}
                  files={[]}
                  note={selectedQueueItem.note}
                  onReset={() => setSelectedQueueItem(null)}
                  onBackToQueue={() => setSelectedQueueItem(null)}
                />
              ) : (
                <ReportResult
                  result={selectedQueueItem.result}
                  teacher={selectedQueueItem.teacher}
                  files={[]}
                  note={selectedQueueItem.note}
                  onReset={() => setSelectedQueueItem(null)}
                  onBackToQueue={() => setSelectedQueueItem(null)}
                />
              )
            ) : (
              <div style={{ padding: "8px 0" }}>
                <div style={{ fontFamily: "'Nunito'", fontSize: 17, fontWeight: 800, color: "#2D2D3A", marginBottom: 16 }}>分析队列</div>
                {queue.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "#BBAACC", fontSize: 13 }}>暂无记录，先去上传吧</div>
                ) : (
                  queue.map(item => (
                    <QueueItem key={item.id} item={item} onView={(it) => setSelectedQueueItem(it)} />
                  ))
                )}
                <button onClick={() => setView("upload")} style={{
                  width: "100%", marginTop: 16, padding: "12px", borderRadius: 14, border: "1.5px solid #EEE5F5",
                  background: "white", color: "#886699", fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}>← 返回上传</button>
              </div>
            )
          ) : (
          <>
          {step === 0 && (
            <div>
              <div style={{ fontFamily: "'Nunito'", fontSize: 17, fontWeight: 800, color: "#2D2D3A", marginBottom: 20 }}>
                今天是哪位老师的课？
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: "#BBAACC", fontWeight: 600, marginBottom: 8 }}>选择老师</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {TEACHERS.map(t => (
                    <div key={t} className="select-opt" onClick={() => setTeacher(t)} style={{
                      padding: "8px 16px", borderRadius: 40, fontSize: 13, fontWeight: 600,
                      background: teacher === t ? "#FF6B6B" : "#FAF5FF",
                      color: teacher === t ? "white" : "#886699",
                      border: `1.5px solid ${teacher === t ? "#FF6B6B" : "#EEE5F5"}`,
                      boxShadow: teacher === t ? "0 4px 12px rgba(255,107,107,0.3)" : "none",
                    }}>{t}</div>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, color: "#BBAACC", fontWeight: 600, marginBottom: 8 }}>备注（可选）</div>
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  placeholder="比如：今天胡飘丹状态不好，后半段注意力分散..."
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 14,
                    border: "1.5px solid #EEE5F5", outline: "none",
                    fontSize: 13, color: "#444", lineHeight: 1.6,
                    resize: "none", height: 80, fontFamily: "inherit", background: "#FDFAFF",
                  }} />
              </div>
              <button className="btn-primary" onClick={() => setStep(1)} disabled={!canNext} style={{
                width: "100%", padding: "14px", borderRadius: 16, border: "none",
                background: canNext ? "linear-gradient(135deg, #FF6B6B, #FF8E53)" : "#F0EEF5",
                color: canNext ? "white" : "#CCBBDD",
                fontSize: 15, fontWeight: 700, cursor: canNext ? "pointer" : "not-allowed",
                fontFamily: "'Nunito'",
              }}>下一步 →</button>
            </div>
          )}

          {step === 1 && (
            <div>
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontFamily: "'Nunito'", fontSize: 17, fontWeight: 800, color: "#2D2D3A" }}>上传课堂文件</div>
                <div style={{ fontSize: 12, color: "#BBAACC", marginTop: 4 }}>
                  {teacher}{note && ` · ${note.slice(0, 15)}${note.length > 15 ? "..." : ""}`}
                </div>
              </div>
              <div onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)} onDrop={handleDrop}
                onClick={() => fileRef.current.click()}
                style={{
                  marginTop: 20, border: `2px dashed ${dragging ? "#FF6B6B" : "#E8E0F5"}`,
                  borderRadius: 18, padding: "28px 20px", textAlign: "center", cursor: "pointer",
                  background: dragging ? "#FFF5F5" : "#FDFAFF", transition: "all 0.2s",
                }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{dragging ? "⬇️" : "📂"}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#886699", marginBottom: 4 }}>
                  {dragging ? "松开即可上传" : "点击或拖拽文件到这里"}
                </div>
                <div style={{ fontSize: 11, color: "#BBAACC" }}>支持 txt · docx · mp3 · mp4 · m4a · wav</div>
                <input ref={fileRef} type="file" multiple accept=".txt,.docx,.doc,.mp3,.mp4,.m4a,.wav" onChange={handleFile} style={{ display: "none" }} />
              </div>

              {files.length > 0 && (
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  {files.map((f, i) => (
                    <div key={i} className="file-item" style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 14px", borderRadius: 12, background: "#FAF5FF", border: "1px solid #EEE5F5",
                    }}>
                      <span style={{ fontSize: 20 }}>{getFileIcon(f)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                        <div style={{ fontSize: 10, color: "#BBAACC" }}>{formatSize(f.size)}</div>
                      </div>
                      <button className="remove-btn" onClick={() => removeFile(i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#FFAAAA", padding: 4 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 12, background: "#FFF0F0", border: "1px solid #FFCCCC", fontSize: 12, color: "#FF4444" }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button onClick={() => setStep(0)} style={{
                  flex: 1, padding: "13px", borderRadius: 14, border: "1.5px solid #EEE5F5",
                  background: "white", color: "#BBAACC", fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}>← 返回</button>
                <button className="btn-primary" onClick={handleSubmit} disabled={!canSubmit || loading} style={{
                  flex: 2, padding: "13px", borderRadius: 14, border: "none",
                  background: canSubmit ? "linear-gradient(135deg, #6C63FF, #A78BFA)" : "#F0EEF5",
                  color: canSubmit ? "white" : "#CCBBDD",
                  fontSize: 14, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  fontFamily: "'Nunito'",
                }}>
                  {loading ? (
                    <>
                      <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      AI 分析中...
                    </>
                  ) : `提交 ${files.length > 0 ? `(${files.length}个文件)` : ""}`}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            isRichReport(result) ? (
              <RichReport
                result={result}
                teacher={teacher}
                files={files}
                note={note}
                onReset={reset}
                onBackToQueue={() => { setView("queue"); setSelectedQueueItem(null); setStep(0); reset(); }}
              />
            ) : (
              <ReportResult
                result={result}
                teacher={teacher}
                files={files}
                note={note}
                onReset={reset}
                onBackToQueue={() => { setView("queue"); setSelectedQueueItem(null); setStep(0); reset(); }}
              />
            )
          )}
          </>
          )}
        </div>

        <div style={{ textAlign: "center", fontSize: 11, color: "#DDCCEE", marginTop: 20 }}>
          数据安全加密 · 自动备份至数据库
        </div>
      </div>
    </div>
  );
}
