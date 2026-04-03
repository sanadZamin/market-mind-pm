package com.marketmind.pmapi.dto;

import com.marketmind.pmapi.models.User;

public class AuthResponse {
  public User user;
  public String token;

  public AuthResponse() {}

  public AuthResponse(User user, String token) {
    this.user = user;
    this.token = token;
  }
}

