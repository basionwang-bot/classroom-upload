// ==================== 配置区 ====================
const COZE_API_URL = "https://api.coze.cn/v1/workflows/run";
const COZE_API_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjcwMTQyY2UwLWFiZGQtNDFhMy04Yzk0LWM3NGU5ZGNmNWJiNyJ9.eyJpc3MiOiJodHRwczovL2FwaS5jb3plLmNuIiwiYXVkIjpbIno4dWhaWXh4MGZSbVdaWkRuSmk2eVBRR3JENUp2WE9hIl0sImV4cCI6ODIxMDI2Njg3Njc5OSwiaWF0IjoxNzcyMjQ4MDk1LCJzdWIiOiJzcGlmZmU6Ly9hcGkuY296ZS5jbi93b3JrbG9hZF9pZGVudGl0eS9pZDo3NjExNzM5MDY4NTkzODY0NzE0Iiwic3JjIjoiaW5ib3VuZF9hdXRoX2FjY2Vzc190b2tlbl9pZDo3NjExNzQ3NjExMzk3MDYyNjk0In0.OUo-Sytyr3_wuULWt9SMny-5FsoGIwZzlOuuNw8QuM7E_YfZEbKyjUhfjRokp1nhC7nFVf_-a5S0cBqtUOylDbrn5qosOoIUoNlnvKcAnxTcjYhAm51FxvGVeCiE_s7Wwij3CY-IbV4XVUcuXkE1FnkcdJKSpVxn4RypQxPZfZ_ZFTwdFsfdD6eaNI77sVfYrExaNUDD4tPLXLhT3DIU_Vwxqc_A5Mui9AUUow3iAjc9ZGFWsqgJW_YGl9xDy3pdigxpTUP750PlfK6YzBiwJ5kfBx1sSQtTe9z2-j--Cx5_a3SkeDMlO27h_mshz3yrxVGco-FH0pDJAxilSvmrfQ";
const WORKFLOW_ID = "7611736638871322633";

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
    // 构建 Coze API 请求
    const requestBody = {
      workflow_id: WORKFLOW_ID,
      parameters: req.body
    };

    console.log("调用 Coze API...", {
      url: COZE_API_URL,
      workflow_id: WORKFLOW_ID
    });

    // 调用 Coze API
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

    // 解析响应
    const data = await response.json();
    console.log("API 响应成功");

    // 返回成功结果
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
