package com.marketmind.pmapi.model;

public class Comment {
  public int id;
  public String content;
  public int taskId;
  public int userId;
  public User user; // nullable
  public String createdAt;
  public String updatedAt;
}

