package com.marketmind.pmapi.models;

public class Project {
  public int id;
  public String name;
  public String description;
  public String color;
  public String status;
  public int ownerId;
  public String startDate; // YYYY-MM-DD or null
  public String endDate;   // YYYY-MM-DD or null
  public int taskCount;
  public int completedTaskCount;
  public String createdAt;
  public String updatedAt;
}

