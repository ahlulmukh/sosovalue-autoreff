import axios, { AxiosResponse } from "axios";
import fs from "fs";
import { simpleParser } from "mailparser";
import path from "path";
import { antiCaptcha, solveTurnstileCaptcha, solveTurnstileCaptchaPuppeter } from "../utils/captchaServices";
import { EmailGenerator } from "../utils/generate";
import { logMessage } from "../utils/logger";
import { authorize } from "./authGmail";
import { getProxyAgent } from "./proxy";


const configPath = path.resolve(__dirname, "../../config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const confEmail = config.email;

export class sosoValuRefferal {
  private refCode: string;
  private proxy: string | null;
  private axiosConfig: any;
  private baseEmail: string;
  private siteKey: string;
  private captchaMethod: string;
  private currentNum: number;
  private total: number;

  constructor(refCode: string, proxy: string | null = null, captchaMethod: string = "1", currentNum: number, total: number) {
    this.refCode = refCode;
    this.proxy = proxy;
    this.captchaMethod = captchaMethod;
    this.currentNum = currentNum;
    this.total = total;
    this.axiosConfig = {
      ...(this.proxy && { httpsAgent: getProxyAgent(this.proxy, this.currentNum, this.total) }),
      timeout: 60000,
    };
    this.baseEmail = confEmail;
    this.siteKey = "0x4AAAAAAA4PZrjDa5PcluqN";

  }

  async makeRequest(method: string, url: string, config: any = {}, retries: number = 3): Promise<AxiosResponse | null> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios({
          method,
          url,
          ...this.axiosConfig,
          ...config,
        });
        return response;
      } catch (error) {
        if (i === retries - 1) {
          logMessage(null, null, `Request failed: ${(error as any).message}`, "error");
          return null;
        }
        logMessage(
          null,
          null,
          `Retrying... (${i + 1}/${retries})`,
          "warning"
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    return null;
  }

  generateTempEmail() {
    const emailGenerator = new EmailGenerator(this.baseEmail);
    const tempEmail = emailGenerator.generateRandomVariation();
    logMessage(
      this.currentNum,
      this.total,
      `Email using : ${tempEmail}`,
      "success"
    );
    return tempEmail;
  }

  async cekEmailValidation(email: string) {
    logMessage(
      this.currentNum,
      this.total,
      "Checking Email ...",
      "process"
    );

    const response = await this.makeRequest(
      "POST",
      `https://gw.sosovalue.com/usercenter/user/anno/checkEmailIsRegister/V2?email=${email}`
    );

    if (response && response.data.data === true) {
      logMessage(this.currentNum, this.total, "Email Available", "success");
      return true;
    } else {
      return false;
    }
  }

  async getSessionCookies(): Promise<string | null> {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
      "Referer": "https://sosovalue.com/",
      "Origin": "https://sosovalue.com/",
    }
    try {
      const response = await this.makeRequest("GET", "https://log.sosovalue.com/track", { headers: headers });

      if (!response) {
        logMessage(this.currentNum, this.total, "Failed to get a response!", "error");
        return null;
      }
      const rawCookies = response.headers["set-cookie"];
      if (!rawCookies) {
        logMessage(this.currentNum, this.total, "No cookies received!", "error");
        return null;
      }

      const cookies = rawCookies.map(cookie => cookie.split(";")[0]).join("; ");
      return cookies;
    } catch (error) {
      logMessage(null, null, `Failed to fetch session cookies: ${(error as any).message}`, "error");
      return null;
    }
  }


  async sendEmailCode(email: string, password: string) {
    logMessage(this.currentNum, this.total, "Trying to solve CAPTCHA...", "process");
    let captchaResponse: string | null = null;
    if (this.captchaMethod === "1") {
      captchaResponse = await solveTurnstileCaptcha(this.siteKey, "https://sosovalue.com/");
    } else if (this.captchaMethod === "2") {
      captchaResponse = await solveTurnstileCaptchaPuppeter();
    } else if (this.captchaMethod === "3") {
      captchaResponse = await antiCaptcha(this.siteKey, "https://sosovalue.com/");
    } else {
      logMessage(this.currentNum, this.total, "Invalid CAPTCHA method selected.", "error");
      return false;
    }

    if (!captchaResponse) {
      logMessage(this.currentNum, this.total, "Failed to solve CAPTCHA", "error");
      return false;
    }
    const sessionCookies = await this.getSessionCookies();
    if (!sessionCookies) {
      logMessage(this.currentNum, this.total, "Failed to obtain session cookies", "error");
      return false;
    }

    logMessage(this.currentNum, this.total, "CAPTCHA solved, sending verification code...", "success");

    const headers = {
      "Content-Type": "application/json",
      "Origin": "https://sosovalue.com",
      Referer: "https://sosovalue.com",
      Cookie: sessionCookies,
    };

    const dataSend = {
      email: email,
      password: password,
      rePassword: password,
      username: "NEW_USER_NAME_02",
    };

    const response = await this.makeRequest(
      "POST",
      `https://gw.sosovalue.com/usercenter/email/anno/sendRegisterVerifyCode/V2?cf-turnstile-response=${captchaResponse}`,
      {
        data: dataSend,
        headers: headers,
      }
    );

    if (response && response.data) {
      logMessage(this.currentNum, this.total, "Email Verification Sent", "success");
      return true;
    } else {
      return null;
    }
  }


  async getCodeVerification(email: string) {
    logMessage(
      this.currentNum,
      this.total,
      "Waiting for code verification...",
      "process"
    );
    const client = await authorize();
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      logMessage(
        this.currentNum,
        this.total,
        `Attempt ${attempt + 1}`,
        "process"
      );

      logMessage(
        this.currentNum,
        this.total,
        "Waiting for 10sec...",
        "warning"
      );
      await new Promise((resolve) => setTimeout(resolve, 10000));

      try {
        const lock = await client.getMailboxLock("INBOX");
        try {
          const messages = await client.fetch("1:*", {
            envelope: true,
            source: true,
          });

          for await (const message of messages) {
            if (message.envelope.to && message.envelope.to.some((to) => to.address === email)) {
              const emailSource = message.source.toString();
              const parsedEmail = await simpleParser(emailSource);
              const verificationCode = this.extractVerificationCode(parsedEmail.text);

              if (verificationCode) {
                logMessage(
                  this.currentNum,
                  this.total,
                  `Verification code found: ${verificationCode}`,
                  "success"
                );
                return verificationCode;
              } else {
                logMessage(
                  this.currentNum,
                  this.total,
                  "No verification code found in the email body.",
                  "warning"
                );
              }
            }
          }
        } finally {
          lock.release();
        }
      } catch (error) {
        console.error("Error fetching emails:", error);
      }

      logMessage(
        this.currentNum,
        this.total,
        "Verification code not found. Waiting for 5 sec...",
        "warning"
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    logMessage(
      this.currentNum,
      this.total,
      "Error get code verification.",
      "error"
    );
    return null;
  }

  extractVerificationCode(content: any) {
    if (!content) return null;
    const textCodeMatch = content.match(/\[SoSoValue\] Your verification code is:\s*\n\s*(\d{6})\s*\n/);

    if (textCodeMatch) {
      return textCodeMatch[1];
    }
    return null;
  }


  async getReferralCode(token: string) {
    const headers = {
      Authorization: `Bearer ${token}`
    }

    const response = await this.makeRequest(
      "GET",
      "https://gw.sosovalue.com/authentication/user/getUserInfo",
      {
        headers: headers,
      }
    );

    if (response && response.data.code == 0) {
      return response.data.data.invitationCode;
    } else {
      logMessage(this.currentNum, this.total, "Failed Get User Info", "error");
      return null;
    }

  }

  async registerAccount(email: string, password: string) {
    logMessage(this.currentNum, this.total, "Register account...", "process");
    const cekEmail = await this.cekEmailValidation(email)
    if (!cekEmail) {
      logMessage(this.currentNum, this.total, "Email already registered", "error");
      return null;
    }
    const sendEmailCode = await this.sendEmailCode(email, password);
    if (!sendEmailCode) {
      logMessage(this.currentNum, this.total, "Failed send email", "error");
      return null;
    }
    const verifyCode = await this.getCodeVerification(email);
    if (!verifyCode) {
      logMessage(
        this.currentNum,
        this.total,
        "Failed to get verification code ",
        "error"
      );
      return null;
    }

    const registerData = {
      email: email,
      invitationCode: this.refCode,
      invitationFrom: null,
      password: password,
      rePassword: password,
      username: "NEW_USER_NAME_02",
      verifyCode: verifyCode,
    };

    const response = await this.makeRequest(
      "POST",
      "https://gw.sosovalue.com/usercenter/user/anno/v3/register",
      {
        data: registerData,
      }
    );


    if (response && response.data.code == 0) {
      logMessage(this.currentNum, this.total, "Register Succesfully", "success");
      const invitationCode = await this.getReferralCode(response.data.data.token);
      return { ...response.data, invitationCode };
    } else {
      logMessage(this.currentNum, this.total, "Failed Register", "error");
      return null;
    }
  }

}