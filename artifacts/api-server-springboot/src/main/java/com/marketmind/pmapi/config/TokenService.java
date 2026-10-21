package com.marketmind.pmapi.config;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TokenService {
  private final Map<String, Integer> sessions = new ConcurrentHashMap<>();
  private final SecureRandom random = new SecureRandom();

  public String makeToken(int userId) {
    byte[] bytes = new byte[32];
    random.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
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
