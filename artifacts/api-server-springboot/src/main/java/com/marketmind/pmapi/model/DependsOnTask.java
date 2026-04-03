package com.marketmind.pmapi.model;

public class DependsOnTask {
  public Integer id;
  public String title;
  public String status;

  public DependsOnTask() {}

  public DependsOnTask(Integer id, String title, String status) {
    this.id = id;
    this.title = title;
    this.status = status;
  }
}

