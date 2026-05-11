package com.marketmind.pmapi.config;

import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Public base URL of the PM SPA (no trailing slash), used in notification email links.
 * <p>Resolution order (first non-blank wins): {@code PM_TOOL_BASE_URL}, {@code PUBLIC_APP_URL},
 * {@code FRONTEND_URL}, then {@code http://localhost:5173} for local dev.
 * <p>This reads {@link Environment} directly so an empty {@code PM_TOOL_BASE_URL} from Docker Compose
 * does not hide the other variables.
 */
@Component
public class PmToolProperties {

  private static final String[] KEYS = {"PM_TOOL_BASE_URL", "PUBLIC_APP_URL", "FRONTEND_URL"};
  private static final String DEFAULT_BASE = "http://localhost:5173";

  private final Environment environment;

  public PmToolProperties(Environment environment) {
    this.environment = environment;
  }

  public String getBaseUrl() {
    for (String key : KEYS) {
      String v = environment.getProperty(key);
      if (v != null && !v.isBlank()) {
        return v.trim().replaceAll("/+$", "");
      }
    }
    return DEFAULT_BASE;
  }
}
