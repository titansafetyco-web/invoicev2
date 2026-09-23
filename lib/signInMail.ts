import dns from "dns/promises";
import net from "net";

type SignInMail = {
  to: string;
  fullName: string;
  password: string;
  role: string;
  loginUrl: string;
  companyName: string;
  replyTo?: string;
};

function headerSafe(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function mailHosts(domain: string) {
  try {
    const records = await dns.resolveMx(domain);
    const hosts = records
      .sort((a, b) => a.priority - b.priority)
      .map((record) => record.exchange.replace(/\.$/, ""))
      .filter(Boolean);
    if (hosts.length) return hosts;
  } catch {
    // Fall through to the domain itself when it has no MX record.
  }
  return [domain];
}

class Smtp {
  private buf = "";
  private pending: Array<{ resolve: (reply: { code: number; text: string }) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }> = [];
  private socket: net.Socket;

  constructor(socket: net.Socket) {
    this.socket = socket;
    socket.on("data", (chunk) => {
      this.buf += chunk.toString("utf8");
      this.drain();
    });
    socket.on("error", (error) => this.fail(error));
    socket.on("timeout", () => this.fail(new Error("The mail server did not respond.")));
    socket.on("close", () => this.fail(new Error("The mail server closed the connection.")));
  }

  private fail(error: Error) {
    const waiters = this.pending.splice(0);
    for (const waiter of waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
  }

  private drain() {
    while (this.pending.length && this.buf.includes("\r\n")) {
      const lines = this.buf.split("\r\n");
      const incomplete = this.buf.endsWith("\r\n") ? "" : lines.pop() ?? "";
      let end = -1;
      for (let i = 0; i < lines.length; i++) {
        if (/^\d{3} /.test(lines[i])) {
          end = i;
          break;
        }
      }
      if (end < 0) return;
      const replyLines = lines.slice(0, end + 1);
      this.buf = lines.slice(end + 1).join("\r\n");
      if (this.buf) this.buf += "\r\n";
      this.buf += incomplete;
      const last = replyLines[replyLines.length - 1];
      const waiter = this.pending.shift();
      if (!waiter) return;
      clearTimeout(waiter.timer);
      waiter.resolve({ code: Number(last.slice(0, 3)), text: replyLines.join(" ") });
    }
  }

  read() {
    return new Promise<{ code: number; text: string }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("The mail server did not respond.")), 15000);
      this.pending.push({ resolve, reject, timer });
      this.drain();
    });
  }

  async cmd(line: string, ok: number[]) {
    this.socket.write(`${line}\r\n`);
    const reply = await this.read();
    if (!ok.includes(reply.code)) throw new Error(reply.text.replace(/\s+/g, " ").slice(0, 220));
    return reply;
  }

  close() {
    this.socket.end();
  }
}

function connect(host: string) {
  return new Promise<net.Socket>((resolve, reject) => {
    const socket = net.connect({ host, port: 25 });
    socket.setTimeout(15000);
    const fail = (error: Error) => {
      socket.destroy();
      reject(error);
    };
    socket.once("error", fail);
    socket.once("timeout", () => fail(new Error("The mail server did not respond.")));
    socket.once("connect", () => {
      socket.off("error", fail);
      resolve(socket);
    });
  });
}

function message(input: SignInMail, from: string) {
  const name = headerSafe(input.fullName) || "there";
  const to = headerSafe(input.to);
  const role = headerSafe(input.role);
  const loginUrl = headerSafe(input.loginUrl);
  const company = headerSafe(input.companyName) || "All American Asphalt";
  const text = [
    `Hello ${name},`,
    "",
    "Your billing sign-in is ready.",
    "",
    `Email: ${to}`,
    `Password: ${input.password}`,
    `Role: ${role}`,
    "",
    `Sign in at ${loginUrl}`,
    "Use this email address on the sign-in page.",
    "",
    company,
  ].join("\r\n");
  const html = `<p>Hello ${escapeHtml(name)},</p>
<p>Your billing sign-in is ready.</p>
<p>Email: ${escapeHtml(to)}<br>Password: ${escapeHtml(input.password)}<br>Role: ${escapeHtml(role)}</p>
<p><a href="${escapeHtml(loginUrl)}">Sign in</a></p>
<p>Use this email address on the sign-in page.</p>
<p>${escapeHtml(company)}</p>`;
  const boundary = `aaa-${crypto.randomUUID()}`;
  const headers = [
    `From: "${company.replace(/[\\"]/g, "")}" <${from}>`,
    `To: ${to}`,
    `Subject: Your ${company} sign-in`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${from.split("@")[1]}>`,
    "MIME-Version: 1.0",
    input.replyTo ? `Reply-To: ${headerSafe(input.replyTo)}` : "",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean);
  const body = [
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    text,
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "",
    html,
    `--${boundary}--`,
    "",
  ].join("\r\n");
  const stuffed = `${headers.join("\r\n")}\r\n\r\n${body}`
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
  return stuffed;
}

async function deliver(host: string, input: SignInMail, from: string) {
  const socket = await connect(host);
  const smtp = new Smtp(socket);
  try {
    const greet = await smtp.read();
    if (greet.code !== 220) throw new Error(greet.text);
    await smtp.cmd(`EHLO ${from.split("@")[1]}`, [250]);
    await smtp.cmd(`MAIL FROM:<${from}>`, [250]);
    await smtp.cmd(`RCPT TO:<${input.to}>`, [250, 251]);
    await smtp.cmd("DATA", [354]);
    socket.write(`${message(input, from)}\r\n.\r\n`);
    const accepted = await smtp.read();
    if (accepted.code !== 250) throw new Error(accepted.text.replace(/\s+/g, " ").slice(0, 220));
  } finally {
    smtp.close();
  }
}

export async function sendSignInEmail(input: SignInMail) {
  const domain = input.to.split("@")[1]?.toLowerCase();
  if (!domain) throw new Error("Enter a valid email.");
  const from = "billing@allamericanasphaltpaving.com";
  const hosts = await mailHosts(domain);
  let last = "The sign-in email could not be sent.";
  for (const host of hosts) {
    try {
      await deliver(host, input, from);
      return;
    } catch (error) {
      last = error instanceof Error ? error.message : last;
    }
  }
  throw new Error(last);
}
