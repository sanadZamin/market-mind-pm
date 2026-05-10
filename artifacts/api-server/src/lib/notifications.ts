import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import { Resend, type Attachment as ResendAttachment } from "resend";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger.js";
import { readFile } from "node:fs/promises";

type SendUpdateEmailInput = {
  actorUserId: number;
  subject: string;
  intro: string;
  details?: string[];
  actionUrl?: string;
  actionLabel?: string;
};

let transporter: nodemailer.Transporter | null = null;
let transportVerified = false;
let resendClient: Resend | null = null;

function getResendClient() {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  if (!resendClient) resendClient = new Resend(key);
  return resendClient;
}

/** Resend REST API: set `RESEND_API_KEY` and a verified-domain `EMAIL_FROM` (see https://resend.com/docs). */
function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.EMAIL_FROM,
  );
}

function isEmailDebugEnabled() {
  return process.env.EMAIL_DEBUG === "true";
}

/** Set `EMAIL_ENABLED=false` to skip all team notification emails without changing SMTP settings. */
function isEmailSendingEnabled() {
  const v = process.env.EMAIL_ENABLED?.trim().toLowerCase();
  if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  return true;
}

function isEmailConfigured() {
  const configured = isResendConfigured() || isSmtpConfigured();
  if (isEmailDebugEnabled() && !configured) {
    logger.info(
      {
        resendApiKeySet: Boolean(process.env.RESEND_API_KEY?.trim()),
        smtpHostSet: Boolean(process.env.SMTP_HOST),
        smtpPortSet: Boolean(process.env.SMTP_PORT),
        smtpUserSet: Boolean(process.env.SMTP_USER),
        smtpPassSet: Boolean(process.env.SMTP_PASS),
        emailFromSet: Boolean(process.env.EMAIL_FROM),
      },
      "Email disabled: set RESEND_API_KEY + EMAIL_FROM, or full SMTP_* + EMAIL_FROM",
    );
  }
  return configured;
}

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildEmailTemplate(input: {
  subject: string;
  intro: string;
  actorName: string;
  details: string[];
  actionUrl?: string;
  actionLabel?: string;
  logoSrc?: string;
}) {
  const escapedSubject = escapeHtml(input.subject);
  const escapedIntro = escapeHtml(input.intro);
  const escapedActorName = escapeHtml(input.actorName);

  const detailsHtml = input.details.length
    ? `<ul style="margin: 8px 0 0; padding-left: 20px; color: #1e3a32;">
        ${input.details.map((line) => `<li style="margin: 4px 0;">${escapeHtml(line)}</li>`).join("")}
      </ul>`
    : `<p style="margin: 8px 0 0; color: #5d7c73;">No extra details were provided.</p>`;

  const logoHtml = input.logoSrc
    ? `<img src="${escapeHtml(input.logoSrc)}" alt="Market Mind" width="36" height="36" style="display:block; border-radius: 8px;" />`
    : `<div style="width: 36px; height: 36px; border-radius: 8px; background: #0f2e22; border: 1px solid #1f4f3d;"></div>`;

  const actionUrl = input.actionUrl?.trim();
  const actionLabel = input.actionLabel?.trim() || "Open update";
  const ctaHtml = actionUrl
    ? `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top: 14px;">
        <tr>
          <td bgcolor="#13eac1" style="border-radius: 8px;">
            <a href="${escapeHtml(actionUrl)}" style="display: inline-block; padding: 10px 14px; color: #06251b; text-decoration: none; font-weight: 700; border-radius: 8px; font-size: 14px;">
              ${escapeHtml(actionLabel)}
            </a>
          </td>
        </tr>
      </table>`
    : "";

  const html = `
  <div style="background-color: #f3f8f6; padding: 24px; font-family: Arial, Helvetica, sans-serif; color: #10211c;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #d8ebe4; border-radius: 12px; overflow: hidden;">
      <tr>
        <td bgcolor="#13eac1" style="padding: 16px 22px; background-color: #13eac1; color: #06251b;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td width="44" valign="middle">
                ${logoHtml}
              </td>
              <td valign="middle" style="font-weight: 700; font-size: 16px;">
                Market Mind Team Update
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 22px;">
          <h2 style="margin: 0 0 10px; color: #10211c; font-size: 20px; line-height: 1.3;">${escapedSubject}</h2>
          <p style="margin: 0; color: #304b43; line-height: 1.6;">${escapedIntro}</p>
          <p style="margin: 14px 0 0; color: #36584f; font-size: 14px;">
            <strong style="color: #10211c;">Updated by:</strong> ${escapedActorName}
          </p>
          <div style="margin-top: 16px; padding: 12px 14px; border: 1px solid #d8ebe4; border-radius: 10px; background-color: #f7fbf9;">
            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #36584f; text-transform: uppercase; letter-spacing: 0.04em;">
              Details
            </p>
            ${detailsHtml}
          </div>
          ${ctaHtml}
        </td>
      </tr>
      <tr>
        <td style="padding: 14px 22px; color: #5d7c73; font-size: 12px; border-top: 1px solid #d8ebe4;">
          This is an automated notification from Market Mind.
        </td>
      </tr>
    </table>
  </div>`.trim();

  const text = [
    "Market Mind Team Update",
    `Subject: ${input.subject}`,
    "",
    input.intro,
    `Updated by: ${input.actorName}`,
    "",
    "Details:",
    ...(input.details.length ? input.details.map((line) => `- ${line}`) : ["- No extra details were provided."]),
    ...(actionUrl ? ["", `${actionLabel}: ${actionUrl}`] : []),
  ].join("\n");

  return { html, text };
}

export async function sendTeamUpdateEmail(input: SendUpdateEmailInput) {
  const debug = isEmailDebugEnabled();

  if (debug) {
    logger.info(
      {
        subject: input.subject,
        actorUserId: input.actorUserId,
      },
      "Email debug: sendTeamUpdateEmail called",
    );
  }

  if (!isEmailSendingEnabled()) {
    if (debug) {
      logger.info({ subject: input.subject }, "Email debug: skipped (EMAIL_ENABLED is off)");
    }
    return;
  }

  if (!isEmailConfigured()) return;

  const [actor] = await db.select().from(usersTable).where(eq(usersTable.id, input.actorUserId));
  const recipients = await db.select({ email: usersTable.email }).from(usersTable);

  const recipientEmails = recipients.map((r) => r.email).filter(Boolean);
  if (recipientEmails.length === 0) {
    if (debug) {
      logger.info(
        { actorUserId: input.actorUserId },
        "Email debug: no recipients found (all users missing emails)",
      );
    }
    return;
  }

  const actorName = actor?.name ?? `User #${input.actorUserId}`;
  const detailLines = (input.details ?? []).filter(Boolean);
  const attachments: Mail.Attachment[] = [];
  let logoSrc: string | undefined;

  // Prefer embedded local logo so email clients do not need public URL access.
  const localLogoPath = process.env.EMAIL_LOGO_PATH?.trim();
  if (localLogoPath) {
    try {
      const logoBuffer = await readFile(localLogoPath);
      const logoCid = "market-mind-logo";
      attachments.push({
        filename: localLogoPath.split("/").pop() || "logo.png",
        content: logoBuffer,
        cid: logoCid,
      });
      logoSrc = `cid:${logoCid}`;
    } catch (error) {
      logger.warn({ error, localLogoPath }, "Email logo path could not be read");
    }
  }

  // Fallback to externally hosted URL if local embedding is unavailable.
  if (!logoSrc) {
    const logoUrl = process.env.EMAIL_LOGO_URL?.trim();
    if (logoUrl) logoSrc = logoUrl;
  }

  const { html, text } = buildEmailTemplate({
    subject: input.subject,
    intro: input.intro,
    actorName,
    details: detailLines,
    actionUrl: input.actionUrl,
    actionLabel: input.actionLabel,
    logoSrc,
  });

  try {
    if (isResendConfigured()) {
      const resend = getResendClient();
      if (!resend) return;

      const resendAttachments: ResendAttachment[] = [];
      for (const a of attachments) {
        const buf = a.content;
        const body = Buffer.isBuffer(buf)
          ? buf
          : typeof buf === "string"
            ? Buffer.from(buf, "utf8")
            : null;
        if (!body?.length) continue;
        const entry: ResendAttachment = {
          filename: (typeof a.filename === "string" ? a.filename : undefined) || "attachment",
          content: body,
        };
        if (typeof a.cid === "string") entry.contentId = a.cid;
        resendAttachments.push(entry);
      }

      const { error } = await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: recipientEmails,
        subject: input.subject,
        text,
        html,
        ...(resendAttachments.length > 0 ? { attachments: resendAttachments } : {}),
      });

      if (error) {
        logger.warn({ error }, "Failed to send team update email (Resend)");
        return;
      }

      if (debug) {
        logger.info(
          {
            provider: "resend",
            recipientCount: recipientEmails.length,
            recipients: recipientEmails,
            subject: input.subject,
          },
          "Email debug: email sent",
        );
      }
      return;
    }

    const activeTransporter = getTransporter();

    if (!transportVerified) {
      try {
        await activeTransporter.verify();
        transportVerified = true;
        if (debug) {
          logger.info(
            {
              smtpHost: process.env.SMTP_HOST,
              smtpPort: process.env.SMTP_PORT,
              smtpSecure: process.env.SMTP_SECURE === "true",
            },
            "Email debug: SMTP transporter verified successfully",
          );
        }
      } catch (verifyError) {
        logger.warn(
          { error: verifyError },
          "Email debug: SMTP transporter verification failed",
        );
      }
    }

    await activeTransporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: recipientEmails.join(", "),
      subject: input.subject,
      text,
      html,
      attachments,
    });
    if (debug) {
      logger.info(
        {
          provider: "smtp",
          recipientCount: recipientEmails.length,
          recipients: recipientEmails,
          subject: input.subject,
        },
        "Email debug: email sent",
      );
    }
  } catch (error) {
    logger.warn({ error }, "Failed to send team update email");
  }
}
