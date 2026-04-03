package com.marketmind.pmapi.config;

import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.type.AnnotatedTypeMetadata;

/**
 * True when {@code spring.mail.host} is set to a non-blank value (typically from {@code SMTP_HOST}).
 */
public class MailHostPresentCondition implements Condition {
  @Override
  public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
    String host = context.getEnvironment().getProperty("spring.mail.host");
    return host != null && !host.isBlank();
  }
}
