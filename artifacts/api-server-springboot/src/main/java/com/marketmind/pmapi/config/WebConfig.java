package com.marketmind.pmapi.config;

import com.marketmind.pmapi.config.BearerAuthInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
  private final BearerAuthInterceptor bearerAuthInterceptor;

  public WebConfig(BearerAuthInterceptor bearerAuthInterceptor) {
    this.bearerAuthInterceptor = bearerAuthInterceptor;
  }

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(bearerAuthInterceptor).addPathPatterns("/**");
  }
}

