import chalk from "chalk";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export const prompt = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

export function logMessage(
  currentNum: number | null = null,
  total: number | null = null,
  message: string = "",
  messageType: string = "info"
): void {
  const now = new Date();
  const timestamp = now
    .toLocaleString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(/\./g, ":")
    .replace(/, /g, " ");
  const accountStatus = currentNum && total ? `[${currentNum}/${total}] ` : "";

  const colors = {
    info: chalk.white,
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow,
    process: chalk.cyan,
    debug: chalk.blue,
  };

  const emojis = {
    info: "ℹ️",
    success: "✅",
    error: "❌",
    warning: "⚠️",
    process: "🔄",
    debug: "🐞",
  };

  const logColor = colors[messageType as keyof typeof colors] || chalk.white;
  const emoji = emojis[messageType as keyof typeof emojis] || "❓";

  let logText = logColor(`${emoji} ${message}`);

  console.log(
    `${chalk.white("[")}${chalk.dim(timestamp)}${chalk.white(
      "]"
    )} ${accountStatus}${logText}`
  );
}

export { rl };

