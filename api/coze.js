export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // 不等结果，直接返回成功
  res.status(200).json({ success: true, message: "已提交，AI分析中..." });

  // 后台继续执行
  fetch("https://cpyhzxdrj8.coze.site/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjcwMTQyY2UwLWFiZGQtNDFhMy04Yzk0LWM3NGU5ZGNmNWJiNyJ9.eyJpc3MiOiJodHRwczovL2FwaS5jb3plLmNuIiwiYXVkIjpbIno4dWhaWXh4MGZSbVdaWkRuSmk2eVBRR3JENUp2WE9hIl0sImV4cCI6ODIxMDI2Njg3Njc5OSwiaWF0IjoxNzcyMjQ4MDk1LCJzdWIiOiJzcGlmZmU6Ly9hcGkuY296ZS5jbi93b3JrbG9hZF9pZGVudGl0eS9pZDo3NjExNzM5MDY4NTkzODY0NzE0Iiwic3JjIjoiaW5ib3VuZF9hdXRoX2FjY2Vzc190b2tlbl9pZDo3NjExNzQ3NjExMzk3MDYyNjk0In0.OUo-Sytyr3_wuULWt9SMny-5FsoGIwZzlOuuNw8QuM7E_YfZEbKyjUhfjRokp1nhC7nFVf_-a5S0cBqtUOylDbrn5qosOoIUoNlnvKcAnxTcjYhAm51FxvGVeCiE_s7Wwij3CY-IbV4XVUcuXkE1FnkcdJKSpVxn4RypQxPZfZ_ZFTwdFsfdD6eaNI77sVfYrExaNUDD4tPLXLhT3DIU_Vwxqc_A5Mui9AUUow3iAjc9ZGFWsqgJW_YGl9xDy3pdigxpTUP750PlfK6YzBiwJ5kfBx1sSQtTe9z2-j--Cx5_a3SkeDMlO27h_mshz3yrxVGco-FH0pDJAxilSvmrfQ`,
    },
    body: JSON.stringify(req.body),
  }).catch(console.error);
}