package com.marketmind.pmapi.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class PmToolUrlStartupCheck implements ApplicationRunner {
  private static final Logger log = LoggerFactory.getLogger(PmToolUrlStartupCheck.class);

  private final PmToolProperties pmToolProperties;

  public PmToolUrlStartupCheck(PmToolProperties pmToolProperties) {
    this.pmToolProperties = pmToolProperties;
  }

  @Override
  public void run(ApplicationArguments args) {
    String u = pmToolProperties.getBaseUrl();
    if (u.contains("localhost") || u.contains("127.0.0.1")) {
      log.warn(
          "Public app URL for emails is {} — set PM_TOOL_BASE_URL or PUBLIC_APP_URL (or FRONTEND_URL) to your live SPA, "
              + "e.g. https://example.com/pm (include path prefix if the app is not at /).",
          u
      );
    }
  }
}
