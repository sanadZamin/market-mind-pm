import nodemailer from "nodemailer";
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

function isEmailDebugEnabled() {
  return process.env.EMAIL_DEBUG === "true";
}

function isEmailConfigured() {
  const configured = Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.EMAIL_FROM,
  );
  if (isEmailDebugEnabled() && !configured) {
    logger.info(
      {
        smtpHostSet: Boolean(process.env.SMTP_HOST),
        smtpPortSet: Boolean(process.env.SMTP_PORT),
        smtpUserSet: Boolean(process.env.SMTP_USER),
        smtpPassSet: Boolean(process.env.SMTP_PASS),
        emailFromSet: Boolean(process.env.EMAIL_FROM),
      },
      "Email disabled: missing SMTP configuration",
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
    ? `<ul style="margin: 8px 0 0; padding-left: 20px; color: #d5f8ef;">
        ${input.details.map((line) => `<li style="margin: 4px 0;">${escapeHtml(line)}</li>`).join("")}
      </ul>`
    : `<p style="margin: 8px 0 0; color: #9ad8c7;">No extra details were provided.</p>`;

  const logoHtml = input.logoSrc
    ? `<img src="${escapeHtml(input.logoSrc)}" alt="Market Mind" width="36" height="36" style="display:block; border-radius: 8px;" />`
    : `<div style="width: 36px; height: 36px; border-radius: 8px; background: #0f2e22; border: 1px solid #1f4f3d;"></div>`;

  const actionUrl = input.actionUrl?.trim();
  const actionLabel = input.actionLabel?.trim() || "Open update";
  const ctaHtml = actionUrl
    ? `<a href="${escapeHtml(actionUrl)}" style="display: inline-block; margin-top: 14px; padding: 10px 14px; background: linear-gradient(90deg, #13eac1 0%, #23a7e5 100%); color: #06251b; text-decoration: none; font-weight: 700; border-radius: 8px; font-size: 14px;">
         ${escapeHtml(actionLabel)}
       </a>`
    : "";

  const html = `
  <div style="background: #061910; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e3f7f0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 620px; margin: 0 auto; background: #0a2219; border: 1px solid #1f4f3d; border-radius: 12px; overflow: hidden;">
      <tr>
        <td style="padding: 16px 22px; background: linear-gradient(90deg, #13eac1 0%, #23a7e5 100%); color: #06251b;">
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
          <h2 style="margin: 0 0 10px; color: #e9fff8; font-size: 20px; line-height: 1.3;">${escapedSubject}</h2>
          <p style="margin: 0; color: #c8f3e7; line-height: 1.6;">${escapedIntro}</p>
          <p style="margin: 14px 0 0; color: #9ad8c7; font-size: 14px;">
            <strong style="color: #d6fff4;">Updated by:</strong> ${escapedActorName}
          </p>
          <div style="margin-top: 16px; padding: 12px 14px; border: 1px solid #1f4f3d; border-radius: 10px; background: #0f2e22;">
            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #9ad8c7; text-transform: uppercase; letter-spacing: 0.04em;">
              Details
            </p>
            ${detailsHtml}
          </div>
          ${ctaHtml}
        </td>
      </tr>
      <tr>
        <td style="padding: 14px 22px; color: #7cb9a8; font-size: 12px; border-top: 1px solid #1f4f3d;">
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
  const attachments: nodemailer.Attachment[] = [];
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
