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

import org.springframework.beans.factory.annotation.Value;

import java.util.Arrays;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/auth")
public class AuthController {
  private final TokenService tokenService;
  private final UserRepository userRepository;
  private final BCryptPasswordEncoder passwordEncoder;
  private final boolean registrationEnabled;
  private final Set<String> allowedDomains;

  public AuthController(
      TokenService tokenService,
      UserRepository userRepository,
      BCryptPasswordEncoder passwordEncoder,
      @Value("${pm.auth.registration.enabled:false}") boolean registrationEnabled,
      @Value("${pm.auth.registration.allowed-domains:}") String allowedDomains) {
    this.tokenService = tokenService;
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.registrationEnabled = registrationEnabled;
    this.allowedDomains = Arrays.stream(allowedDomains.split(","))
        .map(d -> d.trim().toLowerCase(Locale.ROOT))
        .filter(d -> !d.isEmpty())
        .collect(Collectors.toSet());
  }

  private boolean isAllowedDomain(String email) {
    if (allowedDomains.isEmpty()) return true;
    if (email == null) return false;
    int at = email.lastIndexOf('@');
    return at >= 0 && allowedDomains.contains(email.substring(at + 1).trim().toLowerCase(Locale.ROOT));
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
    if (!registrationEnabled) {
      return ResponseEntity.status(HttpStatus.FORBIDDEN)
          .body(Map.of("error", "Registration is closed. Ask an admin for an account."));
    }
    if (!isAllowedDomain(request.email)) {
      return ResponseEntity.status(HttpStatus.FORBIDDEN)
          .body(Map.of("error", "Registration is limited to approved email domains."));
    }
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

