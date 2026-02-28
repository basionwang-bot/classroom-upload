# 给 Coze AI 的工作流生成 Prompt（B 方案：网站展示）

复制下面整段内容，粘贴给 Coze 的 AI 助手，让它帮你生成工作流。

---

## 一、完整 Prompt（直接复制给 Coze）

```
请帮我创建一个「少儿编程课堂分析」工作流，满足以下要求：

---

### 1. 输入参数（与 API 请求体一一对应）

- teacher_name（必填）：老师姓名
- remark（可选）：备注信息
- transcript_file（可选）：课堂文字记录，格式为 { url: "data:application/octet-stream;base64,...", file_type: "document" }，支持 txt/docx
- audio_file（可选）：录音文件，格式为 { url: "data:audio/mpeg;base64,...", file_type: "audio" }，支持 mp3/m4a
- transcript_file 和 audio_file 至少有一个

---

### 2. 核心处理步骤

1. 读取 transcript_file 的文字内容（若存在）
2. 若有 audio_file，调用语音转文字得到转写内容
3. 合并文字和转写内容
4. 用大模型分析课堂内容，提取：每个学员的发言次数、知识点掌握情况、情绪状态、课堂表现
5. 生成三种报告：老师版（完整数据）、家长版（正向描述）、孩子版（游戏化成就）
6. **重要：不要推送企业微信，不要写 Notion，只在工作流的最终输出节点返回结果**

---

### 3. 输出要求（必须在 API 响应中返回）

工作流的最终输出必须是一个 JSON 对象，结构如下，以便前端网站直接展示：

```json
{
  "students": [
    {
      "name": "学员姓名",
      "speaking_count": 5,
      "knowledge_mastery": [{"topic": "循环", "level": "掌握"}],
      "emotion_trend": "积极",
      "performance": "优秀"
    }
  ],
  "reports": {
    "teacher": "老师版完整报告内容...",
    "parent": "家长版正向描述...",
    "child": "孩子版游戏化成就..."
  }
}
```

- students：学员分析列表
- reports.teacher：老师版报告（完整数据、教学建议）
- reports.parent：家长版报告（正向、鼓励）
- reports.child：孩子版报告（游戏化、激励）

请确保工作流的「输出」/「结束」节点返回的是这个结构的 JSON，这样调用 stream_run 接口时，响应里才能拿到这些数据供网站展示。

---

### 4. 其他说明

- 输出方式：只通过工作流返回值输出，不推送企业微信、不写数据库
- 接口：工作流会通过 Coze.site 的 stream_run 接口被调用
- 调用方：一个 React 前端 + Vercel API，会解析 data 字段并在网页上展示
```

---

## 二、Coze 生成工作流后，请发给我

工作流搭好后，请告诉我：

1. **工作流输出的具体结构**：Coze 实际返回的 JSON 长什么样（可截图或复制响应示例）
2. 若有字段名或嵌套结构差异，也一并说明

我会根据你提供的实际输出结构，修改前端代码，在「提交成功」页面展示老师版、家长版、孩子版报告和学员分析。
