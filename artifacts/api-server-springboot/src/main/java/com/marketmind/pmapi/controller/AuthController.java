package com.marketmind.pmapi.controller;

import com.marketmind.pmapi.dto.AuthResponse;
import com.marketmind.pmapi.dto.LoginRequest;
import com.marketmind.pmapi.dto.RegisterRequest;
import com.marketmind.pmapi.model.User;
import com.marketmind.pmapi.repository.UserRepository;
import com.marketmind.pmapi.config.BearerAuthInterceptor;
import com.marketmind.pmapi.config.TokenService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
public class AuthController {
  private final TokenService tokenService;
  private final UserRepository userRepository;
  private final BCryptPasswordEncoder passwordEncoder;

  public AuthController(
      TokenService tokenService,
      UserRepository userRepository,
      BCryptPasswordEncoder passwordEncoder) {
    this.tokenService = tokenService;
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
    Optional<UserRepository.UserWithPasswordHash> existing = userRepository.findByEmailWithPasswordHash(request.email);
    if (existing.isEmpty()) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid credentials"));
    }

    UserRepository.UserWithPasswordHash userWithHash = existing.get();
    if (!passwordEncoder.matches(request.password, userWithHash.passwordHash)) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid credentials"));
    }

    User user = userWithHash.user;
    String token = tokenService.makeToken(user.id);
    tokenService.putSession(token, user.id);
    return ResponseEntity.ok(new AuthResponse(user, token));
  }

  @PostMapping("/register")
  public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
    if (userRepository.findByEmail(request.email).isPresent()) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Email already in use"));
    }

    String passwordHash = passwordEncoder.encode(request.password);
    // Node defaults role to "member"
    User created = userRepository.insertUser(request.name, request.email, passwordHash, "member");
    String token = tokenService.makeToken(created.id);
    tokenService.putSession(token, created.id);
    return ResponseEntity.status(HttpStatus.CREATED).body(new AuthResponse(created, token));
  }

  @GetMapping("/me")
  public ResponseEntity<?> me(HttpServletRequest httpRequest) {
    Object userIdObj = httpRequest.getAttribute(BearerAuthInterceptor.USER_ID_ATTR);
    if (!(userIdObj instanceof Integer)) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
    }
    int userId = (Integer) userIdObj;

    Optional<User> user = userRepository.findById(userId);
    if (user.isEmpty()) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
    }
    return ResponseEntity.ok(user.get());
  }

  @PostMapping("/logout")
  public ResponseEntity<?> logout(HttpServletRequest httpRequest) {
    String authHeader = httpRequest.getHeader("Authorization");
    if (authHeader != null && authHeader.startsWith("Bearer ")) {
      String token = authHeader.substring("Bearer ".length());
      tokenService.removeSession(token);
    }
    return ResponseEntity.ok(Map.of("success", true, "message", "Logged out"));
  }
}

