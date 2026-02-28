import { useState, useRef } from "react";

const TEACHERS = ["大白老师", "小七老师", "多多老师", "晨晨老师"];
const COZE_API_URL = "/api/coze";
const COZE_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjcwMTQyY2UwLWFiZGQtNDFhMy04Yzk0LWM3NGU5ZGNmNWJiNyJ9.eyJpc3MiOiJodHRwczovL2FwaS5jb3plLmNuIiwiYXVkIjpbIno4dWhaWXh4MGZSbVdaWkRuSmk2eVBRR3JENUp2WE9hIl0sImV4cCI6ODIxMDI2Njg3Njc5OSwiaWF0IjoxNzcyMjQ4MDk1LCJzdWIiOiJzcGlmZmU6Ly9hcGkuY296ZS5jbi93b3JrbG9hZF9pZGVudGl0eS9pZDo3NjExNzM5MDY4NTkzODY0NzE0Iiwic3JjIjoiaW5ib3VuZF9hdXRoX2FjY2Vzc190b2tlbl9pZDo3NjExNzQ3NjExMzk3MDYyNjk0In0.OUo-Sytyr3_wuULWt9SMny-5FsoGIwZzlOuuNw8QuM7E_YfZEbKyjUhfjRokp1nhC7nFVf_-a5S0cBqtUOylDbrn5qosOoIUoNlnvKcAnxTcjYhAm51FxvGVeCiE_s7Wwij3CY-IbV4XVUcuXkE1FnkcdJKSpVxn4RypQxPZfZ_ZFTwdFsfdD6eaNI77sVfYrExaNUDD4tPLXLhT3DIU_Vwxqc_A5Mui9AUUow3iAjc9ZGFWsqgJW_YGl9xDy3pdigxpTUP750PlfK6YzBiwJ5kfBx1sSQtTe9z2-j--Cx5_a3SkeDMlO27h_mshz3yrxVGco-FH0pDJAxilSvmrfQ";

const steps = ["选择信息", "上传文件", "提交成功"];

const toBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result.split(",")[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export default function App() {
  const [step, setStep] = useState(0);
  const [teacher, setTeacher] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
      setStep(2);
    } catch (err) {
      setError("提交失败，请重试。错误：" + err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0); setTeacher(""); setNote(""); setFiles([]); setError("");
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
      `}</style>

      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>🎓</div>
          <div style={{ fontFamily: "'Nunito'", fontSize: 20, fontWeight: 900, color: "#2D2D3A" }}>课堂记录上传</div>
          <div style={{ fontSize: 12, color: "#BBAACC", marginTop: 2 }}>上传完成，系统自动分析处理</div>
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
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 64, marginBottom: 16, animation: "pop 0.5s ease both" }}>🎉</div>
              <div style={{ fontFamily: "'Nunito'", fontSize: 20, fontWeight: 900, color: "#2D2D3A", marginBottom: 8 }}>上传成功！</div>
              <div style={{ fontSize: 13, color: "#BBAACC", lineHeight: 1.7, marginBottom: 24 }}>
                AI 正在分析课堂内容<br />
                预计 <strong style={{ color: "#FF6B6B" }}>3-5分钟</strong> 后自动写入数据库<br />
                完成后会在企业微信通知你 📩
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
              <button className="btn-primary" onClick={reset} style={{
                width: "100%", padding: "13px", borderRadius: 14, border: "none",
                background: "linear-gradient(135deg, #FF6B6B, #FF8E53)",
                color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
                fontFamily: "'Nunito'", boxShadow: "0 4px 16px rgba(255,107,107,0.3)",
              }}>继续上传下一节课</button>
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", fontSize: 11, color: "#DDCCEE", marginTop: 20 }}>
          数据安全加密 · 自动备份至数据库
        </div>
      </div>
    </div>
  );
}
