import { execSync } from "child_process";
import fetch from "node-fetch";

const getGitInfo = (): { commitHash: string; message: string } => {
  try {
    const commitHash = execSync("git rev-parse --short HEAD").toString().trim();
    const message = execSync("git log -1 --pretty=%B").toString().trim();
    return { commitHash, message };
  } catch {
    return { commitHash: "unknown", message: "unknown" };
  }
};

export const notifyDiscord = async (): Promise<void> => {
  const enabled = process.env.DISCORD_NOTIFY === "true";
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const projectName = process.env.PROJECT_NAME || "未命名專案";

  if (!enabled || !webhookUrl) {
    console.log("📭 Discord 通知已停用（本地環境或未設定 Webhook）");
    return;
  }

  const { commitHash, message } = getGitInfo();

  const content = `🚀 **${projectName} 部署成功**\n✅ Commit: \`${commitHash}\`\n📝 ${message}`;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    console.log("✅ Discord 通知已發送");
  } catch (err) {
    console.error("❌ 發送 Discord 通知失敗:", err);
  }
};
