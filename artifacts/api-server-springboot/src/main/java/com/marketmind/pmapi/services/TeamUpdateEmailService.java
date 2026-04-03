package com.marketmind.pmapi.services;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import jakarta.mail.internet.MimeMessage;

import java.nio.file.Files;
import java.util.List;
import java.util.Map;

@Service
public class TeamUpdateEmailService {
  private final ObjectProvider<JavaMailSender> mailSenderProvider;
  private final JdbcTemplate jdbcTemplate;

  @Value("${email.enabled:true}")
  private boolean emailEnabled;

  @Value("${EMAIL_DEBUG:false}")
  private boolean emailDebug;

  @Value("${EMAIL_FROM:no-reply@localhost}")
  private String emailFrom;

  @Value("${PM_TOOL_BASE_URL:http://localhost:5173}")
  private String pmToolBaseUrl;

  @Value("${EMAIL_LOGO_URL:}")
  private String emailLogoUrl;

  @Value("${EMAIL_LOGO_PATH:}")
  private String emailLogoPath;

  public TeamUpdateEmailService(ObjectProvider<JavaMailSender> mailSenderProvider, JdbcTemplate jdbcTemplate) {
    this.mailSenderProvider = mailSenderProvider;
    this.jdbcTemplate = jdbcTemplate;
  }

  public void sendTeamUpdateEmail(
      int actorUserId,
      String subject,
      String intro,
      List<String> details,
      String actionUrl,
      String actionLabel
  ) {
    if (!emailEnabled) {
      if (emailDebug) {
        System.out.println("[email] skipped (EMAIL_ENABLED=false): " + subject);
      }
      return;
    }

    JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
    if (mailSender == null) {
      if (emailDebug) {
        System.out.println("[email] skipped (no SMTP host / JavaMailSender bean): " + subject);
      }
      return;
    }

    String actorName = jdbcTemplate.queryForObject(
        "select name from users where id = ?",
        String.class,
        actorUserId
    );

    List<String> recipientEmails = jdbcTemplate.queryForList(
        "select email from users where email is not null and email <> ''",
        String.class
    );
    if (recipientEmails == null || recipientEmails.isEmpty()) return;

    String detailsHtml = "";
    if (details != null && !details.isEmpty()) {
      StringBuilder sb = new StringBuilder();
      for (String d : details) {
        if (d == null || d.isBlank()) continue;
        sb.append("<li style=\"margin:0;padding:0 0 6px 0;\">")
            .append(escapeHtml(d))
            .append("</li>");
      }
      detailsHtml = sb.toString();
    } else {
      detailsHtml = "<li style=\"margin:0;padding:0 0 6px 0;\">No extra details were provided.</li>";
    }

    String logoCid = "market-mind-logo";
    byte[] logoBytes = null;
    if (emailLogoPath != null && !emailLogoPath.isBlank()) {
      try {
        logoBytes = Files.readAllBytes(java.nio.file.Paths.get(emailLogoPath));
      } catch (Exception ignored) {
        logoBytes = null;
      }
    }
    boolean hasCidLogo = logoBytes != null && logoBytes.length > 0;
    String logoImgTag;
    if (hasCidLogo) {
      logoImgTag = "<img alt=\"Market Mind\" src=\"cid:" + logoCid + "\" style=\"width:120px;height:auto;\"/>";
    } else if (emailLogoUrl != null && !emailLogoUrl.isBlank()) {
      logoImgTag = "<img alt=\"Market Mind\" src=\"" + escapeHtmlAttr(emailLogoUrl) + "\" style=\"width:120px;height:auto;\"/>";
    } else {
      logoImgTag = "";
    }

    String actionButtonHtml = "";
    if (actionUrl != null && !actionUrl.isBlank()) {
      String href = escapeHtmlAttr(actionUrl);
      String label = actionLabel != null && !actionLabel.isBlank() ? actionLabel : "Open";
      actionButtonHtml =
          "<a href=\"" + href + "\" style=\"display:inline-block;padding:10px 16px;background:#10b981;color:#000;text-decoration:none;border-radius:10px;font-weight:700;\">" +
          escapeHtml(label) + "</a>";
    }

    String html = ("" +
        "<div style=\"font-family: Arial, sans-serif; background:#f3faf7; padding:20px;\">"
        + "<div style=\"max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;padding:18px;\">"
        + "<div style=\"display:flex;align-items:center;gap:14px;\">" + logoImgTag +
        "<div><h2 style=\"margin:0 0 2px 0; color:#065f46;\">Market Mind Team Update</h2>"
        + "<div style=\"font-size:12px;color:#047857;\">Subject: " + escapeHtml(subject) + "</div></div></div>"
        + "<p style=\"margin:14px 0 0 0;line-height:1.5;\">" + escapeHtml(intro) + "</p>"
        + "<p style=\"margin:10px 0 0 0;font-size:13px;color:#065f46;\">Updated by: " + escapeHtml(actorName) + "</p>"
        + "<div style=\"margin-top:14px;border:1px solid #d8ebe4;border-radius:12px;padding:12px;\">"
        + "<div style=\"font-size:12px;font-weight:700;color:#36584f;text-transform:uppercase;letter-spacing:.04em;\">Details</div>"
        + "<ul style=\"margin:10px 0 0 18px;padding:0;\">" + detailsHtml + "</ul>"
        + "</div>"
        + "<div style=\"margin-top:16px;\">" + actionButtonHtml + "</div>"
        + "<div style=\"margin-top:18px;font-size:12px;color:#5d7c73;\">This is an automated notification from Market Mind.</div>"
        + "</div></div>");

    String text = String.join("\n",
        "Market Mind Team Update",
        "Subject: " + subject,
        "",
        intro,
        "Updated by: " + actorName,
        "",
        "Details:",
        details != null && !details.isEmpty() ? String.join("\n", details) : "- No extra details were provided.",
        actionUrl != null && !actionUrl.isBlank() ? actionLabel + ": " + actionUrl : ""
    );

    try {
      MimeMessage message = mailSender.createMimeMessage();
      MimeMessageHelper helper = new MimeMessageHelper(message, hasCidLogo, "UTF-8");
      helper.setFrom(emailFrom);
      for (String to : recipientEmails) helper.addTo(to);
      helper.setSubject(subject);
      if (hasCidLogo) {
        helper.addInline(logoCid, new ByteArrayResource(logoBytes), "image/png");
      }
      helper.setText(html, true);
      mailSender.send(message);
      if (emailDebug) {
        System.out.println("[email] sent: " + subject + " to " + recipientEmails.size() + " recipients");
      }
    } catch (Exception e) {
      if (emailDebug) {
        System.out.println("[email] failed: " + e.getMessage());
      }
    }
  }

  private static String escapeHtml(String value) {
    if (value == null) return "";
    return value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;");
  }

  private static String escapeHtmlAttr(String value) {
    return escapeHtml(value);
  }
}

