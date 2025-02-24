const ac = require("@antiadmin/anticaptchaofficial");
import axios from "axios";
import fs from "fs";
import path from "path";
import { connect } from "puppeteer-real-browser";

const configPath = path.resolve(__dirname, "../../config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const conf2Captcha = config.captcha2;
const anticaptchaKey = config.anticaptcha;

/**
 * Solve Turnstile CAPTCHA using 2Captcha
 * @param siteKey
 * @param pageUrl
 */
export async function solveTurnstileCaptcha(
  siteKey: string,
  pageUrl: string
): Promise<string | null> {
  try {
    const captchaRequest = await axios.post(
      "http://2captcha.com/in.php",
      null,
      {
        params: {
          key: conf2Captcha,
          method: "turnstile",
          sitekey: siteKey,
          pageurl: pageUrl,
          json: 1,
        },
      }
    );

    const captchaId = captchaRequest.data.request;
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const captchaResult = await axios.get("http://2captcha.com/res.php", {
        params: {
          key: conf2Captcha,
          action: "get",
          id: captchaId,
          json: 1,
        },
      });

      if (captchaResult.data.status === 1) {
        return captchaResult.data.request;
      } else if (captchaResult.data.request !== "CAPCHA_NOT_READY") {
        return null;
      }
    }
  } catch (error) {
    console.error("Error solving CAPTCHA:", error);
    return null;
  }
}

/**
 * Solve Turnstile CAPTCHA using Anti-Captcha
 * @param siteKey
 * @param pageUrl
 */
export async function antiCaptcha(
  siteKey: string,
  pageUrl: string
): Promise<string | null> {
  try {
    ac.setAPIKey(anticaptchaKey);
    ac.setSoftId(0);

    const token = await ac.solveTurnstileProxyless(pageUrl, siteKey);
    return token;
  } catch (error) {
    console.error("Error solving CAPTCHA with Anti-Captcha:", error);
    return null;
  }
}

/**
 * Solve Turnstile CAPTCHA using Puppeteer
 */
export async function solveTurnstileCaptchaPuppeter() {
  let browser;
  try {
    const { browser: connectedBrowser, page } = await connect({
      headless: false,
      args: [],
      customConfig: {},
      turnstile: true,
      connectOption: {},
      disableXvfb: false,
      ignoreAllFlags: false,
    });
    const delay = (ms: number | undefined) => new Promise((resolve) => setTimeout(resolve, ms));
    browser = connectedBrowser;
    await page.goto("https://sosovalue.com/");
    await delay(10000);
    const signUpButtonSelector =
      "#exp_top > div.flex.items-center > button.MuiButtonBase-root.MuiIconButton-root.MuiIconButton-sizeMedium.bg-background-brand-accent-600-600.border-0.rounded.text-background-white-white.text-sm.font-semibold.cursor-pointer.py-1.px-3.ml-2.whitespace-nowrap.mui-style-1yxmbwk";
    await page.waitForSelector(signUpButtonSelector, { visible: true });
    await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (element) {
        (element as HTMLElement).click();
      } else {
        console.error(`Element with selector ${selector} not found.`);
      }
    }, signUpButtonSelector);

    await page.evaluate(() => {
      return new Promise((resolve) => setTimeout(resolve, 10000));
    });

    const turnstileSelector =
      "#root > div:nth-child(3) > div.MuiDialog-container.MuiDialog-scrollPaper.mui-style-ekeie0 > div > div > div:nth-child(3) > div.mt-6 > div.flex.flex-col.space-y-5 > div:nth-child(2) > div";
    await page.waitForSelector(turnstileSelector, { visible: true });

    const cfTurnstileResponseValue = await page.evaluate(() => {
      const inputElement = document.querySelector(
        'input[name="cf-turnstile-response"]'
      );
      return inputElement ? (inputElement as HTMLInputElement).value : null;
    });

    if (cfTurnstileResponseValue) {
      return cfTurnstileResponseValue;
    } else {
      console.log("Gagal mendapatkan token");
      return null;
    }
  } catch (error) {
    console.error("Error solving CAPTCHA:");
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
