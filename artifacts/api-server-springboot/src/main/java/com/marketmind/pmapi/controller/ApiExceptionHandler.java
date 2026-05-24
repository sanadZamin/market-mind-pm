package com.marketmind.pmapi.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<?> handleInvalidBody(MethodArgumentNotValidException ex) {
    // Keep same shape as Node:
    // { "error": "Bad request", "message": "Invalid request body" }
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
    
        .body(Map.of("error", "Bad request", "message", "Invalid request body"));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<?> handleUnreadableBody(HttpMessageNotReadableException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(Map.of("error", "Bad request", "message", "Invalid request body"));
  }
}

