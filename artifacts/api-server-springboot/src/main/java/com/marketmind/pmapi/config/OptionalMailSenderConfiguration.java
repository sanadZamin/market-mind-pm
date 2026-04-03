package com.marketmind.pmapi.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

/**
 * Registers {@link JavaMailSender} only when SMTP host is configured.
 * Avoids {@link org.springframework.boot.autoconfigure.mail.MailSenderAutoConfiguration}
 * failing during condition/property processing when mail env vars are missing or ambiguous.
 */
@Configuration
public class OptionalMailSenderConfiguration {

  @Bean
  @Conditional(MailHostPresentCondition.class)
  public JavaMailSender javaMailSender(Environment env) {
    JavaMailSenderImpl impl = new JavaMailSenderImpl();
    impl.setHost(env.getProperty("spring.mail.host"));
    impl.setPort(env.getProperty("spring.mail.port", Integer.class, 587));
    String user = env.getProperty("spring.mail.username", "");
    String pass = env.getProperty("spring.mail.password", "");
    if (!user.isBlank()) {
      impl.setUsername(user);
    }
    if (!pass.isBlank()) {
      impl.setPassword(pass);
    }

    int port = impl.getPort();
    boolean smtpSecure = Boolean.parseBoolean(env.getProperty("SMTP_SECURE", "false"));

    Properties props = impl.getJavaMailProperties();
    props.put("mail.transport.protocol", "smtp");
    props.put("mail.smtp.auth", "true");

    // Port 465: implicit SSL (common for providers like privateemail)
    if (port == 465) {
      props.put("mail.smtp.ssl.enable", "true");
      props.put("mail.smtp.starttls.enable", "false");
    } else {
      props.put("mail.smtp.starttls.enable", String.valueOf(smtpSecure));
      props.put("mail.smtp.ssl.enable", "false");
    }

    return impl;
  }
}
