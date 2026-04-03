package com.marketmind.pmapi.models;

public class User {
  public int id;
  public String name;
  public String email;
  public String avatarUrl;
  public String role;
  public String createdAt;

  public User() {}

  public User(int id, String name, String email, String avatarUrl, String role, String createdAt) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.avatarUrl = avatarUrl;
    this.role = role;
    this.createdAt = createdAt;
  }
}

