import express from "express"; // 載入 Express

const app = express(); // 建一個 Express 應用程式

app.get("/", (req, res) => {
  // 當有人進到首頁時
  res.send("Hello, TypeScript!"); // 回一句話
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
