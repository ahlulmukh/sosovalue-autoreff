import chalk from "chalk";
import fs from "fs";
import { getRandomProxy, loadProxies } from "./classes/proxy";
import { sosoValuRefferal } from "./classes/sosoValue";
import { generatePassword } from "./utils/generate";
import { logMessage, prompt, rl } from "./utils/logger";

async function main(): Promise<void> {
  console.log(
    chalk.cyan(`
░█▀▀░█▀█░█▀▀░█▀█░░░█░█░█▀█░█░░░█░█░█▀▀
░▀▀█░█░█░▀▀█░█░█░░░▀▄▀░█▀█░█░░░█░█░█▀▀
░▀▀▀░▀▀▀░▀▀▀░▀▀▀░░░░▀░░▀░▀░▀▀▀░▀▀▀░▀▀▀
        By : El Puqus Airdrop
        github.com/ahlulmukh
      Use it at your own risk
  `)
  );

  const refCode = await prompt(chalk.yellow("Enter Referral Code: "));
  const count = parseInt(await prompt(chalk.yellow("How many do you want? ")));
  const captchaMethod = await prompt(
    chalk.yellow(`Choose Captcha Metode \n1.2Captcha\n2.Puppeteer (Free)\n3.Anti Captcha\nEnter Number: `)
  );
  const proxiesLoaded = loadProxies();
  if (!proxiesLoaded) {
    logMessage(null, null, "No Proxy. Using default IP", "warning");
  }

  const sosoValueaccount = fs.createWriteStream("accounts.txt", { flags: "a" });
  let successful = 0;
  let attempt = 1;

  try {
    while (successful < count) {
      console.log(chalk.white("-".repeat(85)));
      const currentProxy = await getRandomProxy(successful + 1, count);
      const sosoValue = new sosoValuRefferal(refCode, currentProxy, captchaMethod, successful + 1, count);
      try {

        const email = sosoValue.generateTempEmail();
        const password = generatePassword()
        const registered = await sosoValue.registerAccount(email, password.encodedPassword);

        if (registered) {
          sosoValueaccount.write(`Email Address : ${email}\n`);
          sosoValueaccount.write(`Password : ${password.password}\n`);
          sosoValueaccount.write(`Invitation Code : ${registered.invitationCode}\n`);
          sosoValueaccount.write(`===================================================================\n`);
          successful++;
          attempt = 1;
        } else {
          logMessage(
            successful + 1,
            count,
            "Register Account Failed, retrying...",
            "error"
          );
          attempt++;
        }
      } catch (error) {
        logMessage(
          successful + 1,
          count,
          `Error: ${(error as Error).message}, retrying...`,
          "error"
        );
        attempt++;
      }
    }
  } finally {
    sosoValueaccount.end();
    console.log(chalk.magenta("\n[*] Dono bang!"));
    console.log(
      chalk.green(`[*] Account dono ${successful} dari ${count} akun`)
    );
    console.log(chalk.magenta("[*] Result in accounts.txt"));
    rl.close();
  }

  rl.close();
}

main().catch((err) => {
  console.error(chalk.red("Error occurred:"), err);
  process.exit(1);
});