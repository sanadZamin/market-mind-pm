package com.marketmind.pmapi.model;

import java.util.Date;

public class TaskDependency {
  public int id;
  public int taskId;
  public int dependsOnTaskId;
  public DependsOnTask dependsOnTask; // nullable
  public String createdAt; // ISO string
}

