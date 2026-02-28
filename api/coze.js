// ==================== 配置区 ====================
// Coze.site 发布的工作流接口（从 Coze 工作流部署页面的 API 文档获取）
const COZE_API_URL = "https://cpyhzxdrj8.coze.site/stream_run";
// 优先使用 Vercel 环境变量，便于在控制台配置 Token
const COZE_API_TOKEN = process.env.COZE_API_TOKEN || "eyJhbGciOiJSUzI1NiIsImtpZCI6IjcwMTQyY2UwLWFiZGQtNDFhMy04Yzk0LWM3NGU5ZGNmNWJiNyJ9.eyJpc3MiOiJodHRwczovL2FwaS5jb3plLmNuIiwiYXVkIjpbIno4dWhaWXh4MGZSbVdaWkRuSmk2eVBRR3JENUp2WE9hIl0sImV4cCI6ODIxMDI2Njg3Njc5OSwiaWF0IjoxNzcyMjY5MzE4LCJzdWIiOiJzcGlmZmU6Ly9hcGkuY296ZS5jbi93b3JrbG9hZF9pZGVudGl0eS9pZDo3NjExNzM5MDY4NTkzODY0NzE0Iiwic3JjIjoiaW5ib3VuZF9hdXRoX2FjY2Vzc190b2tlbl9pZDo3NjExODM4NzY0NjU4MTk2NTI2In0.Nv9ROkhIT79-D3vy169UXA2Lmo1560sANxzt5iwzHauu5KDDdBaXm4BL-GzeerrUFTz6aCiouVFfFojtdj_8ka_5tGvC9G7etEpNImN0qLZwOdQFQ2mgGgMkFUEdg1_-i0FHg72TebLpXV2Ei9up-5S-jiUXLU300v6dt-4yQ3rTJv7Vd1k6vShk_o4j_hwLJrQVftNveJPg_0wgnrIa-gzzwkBw405i7ampD8zPpDTDHdVTGKQcflfOm4zCVQ_fj6B8A_CT4UtUPKKwoAAi-7YibYsQeAKFeIs9wk8n4OLneX3kOLuh5TQHpBijc3Ccj-xOJ-dmg4vbz6wltHnv9A";

// ==================== 参数验证 ====================
function validateRequestBody(body) {
  if (!body) {
    return { valid: false, error: "请求体为空" };
  }

  if (!body.teacher_name) {
    return { valid: false, error: "缺少必填参数: teacher_name" };
  }

  return { valid: true };
}

// ==================== 主处理函数 ====================
export default async function handler(req, res) {
  // 方法检查
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "方法不允许，只支持 POST"
    });
  }

  // 参数验证
  const validation = validateRequestBody(req.body);
  if (!validation.valid) {
    console.error("参数验证失败:", validation.error);
    return res.status(400).json({
      success: false,
      error: validation.error
    });
  }

  console.log("收到请求:", {
    teacher: req.body.teacher_name,
    hasTranscript: !!req.body.transcript_file,
    hasAudio: !!req.body.audio_file
  });

  try {
    // Coze.site stream_run 直接传参。空文件不要传，否则 file_type 报错（必须为 image/video/audio/document/default）
    const requestBody = {
      teacher_name: req.body.teacher_name,
      remark: req.body.remark || "",
    };
    const hasTranscript = req.body.transcript_file?.url && req.body.transcript_file?.file_type;
    const hasAudio = req.body.audio_file?.url && req.body.audio_file?.file_type;
    if (hasTranscript) requestBody.transcript_file = req.body.transcript_file;
    if (hasAudio) requestBody.audio_file = req.body.audio_file;

    console.log("调用 Coze API...", { url: COZE_API_URL });

    const response = await fetch(COZE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${COZE_API_TOKEN}`,
      },
      body: JSON.stringify(requestBody),
    });

    // 检查响应状态
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });

      return res.status(response.status).json({
        success: false,
        error: `API 请求失败: ${response.status} ${response.statusText}`,
        details: errorText
      });
    }

    // 解析响应：stream_run 返回 SSE，需解析 events
    const text = await response.text();
    let data = { raw: text };
    let sseError = null;
    let sseOutput = null;

    try {
      const lines = (text || "").split("\n");
      let currentData = null;
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const json = JSON.parse(line.slice(6));
            if (json.type === "error") {
              sseError = json.error_msg || json.message || JSON.stringify(json);
            } else if (json.output) {
              sseOutput = typeof json.output === "string" ? json.output : JSON.stringify(json.output);
            } else if (json.data?.output) {
              sseOutput = typeof json.data.output === "string" ? json.data.output : JSON.stringify(json.data.output);
            } else if (json.students && json.reports) {
              sseOutput = json;
            }
          } catch { /* 非 JSON 或解析失败，忽略 */ }
        }
      }
    } catch { /* 解析失败保留 raw */ }

    if (sseError) {
      console.error("Coze 工作流错误:", sseError);
      return res.status(200).json({
        success: false,
        message: "分析失败",
        error: sseError,
        data: data
      });
    }

    if (sseOutput) {
      try {
        data = typeof sseOutput === "string" ? JSON.parse(sseOutput) : sseOutput;
      } catch {
        data = { output: sseOutput };
      }
    }

    res.status(200).json({
      success: true,
      message: "分析成功",
      data: data
    });

  } catch (error) {
    console.error("请求失败:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
}
