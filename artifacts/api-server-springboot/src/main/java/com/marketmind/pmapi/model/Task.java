package com.marketmind.pmapi.model;

import java.util.List;

public class Task {
  public int id;
  public String title;
  public String description;
  public String status;
  public String priority;
  public int projectId;
  public Integer parentTaskId;
  public Integer assigneeId;
  public int reporterId;

  public User assignee; // nullable
  public User reporter; // nullable

  public int subtaskCount;
  public List<Integer> blockedByIds;
  public List<Integer> blockingIds;

  public String startDate; // YYYY-MM-DD or null
  public String dueDate;    // YYYY-MM-DD or null
  public Double estimatedHours; // nullable

  public List<String> tags;
  public int position;

  public String createdAt;
  public String updatedAt;
}

