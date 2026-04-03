package com.marketmind.pmapi.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Map;

@Component
public class BearerAuthInterceptor implements HandlerInterceptor {
  public static final String USER_ID_ATTR = "userId";

  private final TokenService tokenService;
  private final ObjectMapper objectMapper;

  public BearerAuthInterceptor(TokenService tokenService, ObjectMapper objectMapper) {
    this.tokenService = tokenService;
    this.objectMapper = objectMapper;
  }

  @Override
  public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
    String uri = request.getRequestURI();
    String ctx = request.getContextPath();
    String path =
        ctx != null && !ctx.isEmpty() && uri.startsWith(ctx)
            ? uri.substring(ctx.length())
            : uri;
    if (path.isEmpty()) {
      path = "/";
    }

    // Public endpoints (paths are relative to servlet context-path /api)
    if ("/healthz".equals(path)
        || "/auth/login".equals(path)
        || "/auth/register".equals(path)
        || "/auth/logout".equals(path)) {
      return true;
    }
    // Spring Boot Actuator (health, liveness, etc.) — must not require Bearer token for Docker/k8s probes
    if (path.startsWith("/actuator/")) {
      return true;
    }

    String authHeader = request.getHeader("Authorization");
    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      response.setStatus(401);
      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
      objectMapper.writeValue(response.getWriter(), Map.of("error", "Unauthorized"));
      return false;
    }

    String token = authHeader.substring("Bearer ".length());
    Integer userId = tokenService.getUserId(token);
    if (userId == null) {
      response.setStatus(401);
      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
      objectMapper.writeValue(response.getWriter(), Map.of("error", "Unauthorized"));
      return false;
    }

    request.setAttribute(USER_ID_ATTR, userId);
    return true;
  }
}

