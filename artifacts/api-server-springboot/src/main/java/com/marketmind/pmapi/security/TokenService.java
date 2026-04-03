package com.marketmind.pmapi.security;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TokenService {
  private final Map<String, Integer> sessions = new ConcurrentHashMap<>();

  public String makeToken(int userId) {
    String payload = userId + ":" + Instant.now().toEpochMilli();
    return Base64.getEncoder().encodeToString(payload.getBytes(StandardCharsets.UTF_8));
  }

  public void putSession(String token, int userId) {
    sessions.put(token, userId);
  }

  public Integer getUserId(String token) {
    return sessions.get(token);
  }

  public void removeSession(String token) {
    sessions.remove(token);
  }
}

