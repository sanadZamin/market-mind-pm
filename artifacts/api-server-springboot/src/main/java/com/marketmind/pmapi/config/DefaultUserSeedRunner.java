package com.marketmind.pmapi.config;

import com.marketmind.pmapi.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Inserts a single default user when the DB has no row with the configured email
 * (idempotent). Disable in shared or production environments:
 * {@code PM_SEED_DEFAULT_USER=false}.
 */
@Component
@ConditionalOnProperty(
    prefix = "pm.seed.default-user",
    name = "enabled",
    havingValue = "true",
    matchIfMissing = true)
public class DefaultUserSeedRunner implements ApplicationRunner {
  private static final Logger log = LoggerFactory.getLogger(DefaultUserSeedRunner.class);

  private final UserRepository userRepository;
  private final BCryptPasswordEncoder passwordEncoder;

  @Value("${pm.seed.default-user.email:dev@example.com}")
  private String email;

  @Value("${pm.seed.default-user.name:Dev}")
  private String name;

  @Value("${pm.seed.default-user.password:changeme}")
  private String password;

  @Value("${pm.seed.default-user.role:admin}")
  private String role;

  public DefaultUserSeedRunner(UserRepository userRepository, BCryptPasswordEncoder passwordEncoder) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @Override
  public void run(ApplicationArguments args) {
    String normalizedEmail = email.trim().toLowerCase();
    if (userRepository.findByEmail(normalizedEmail).isPresent()) {
      return;
    }

    String normalizedRole = "admin".equalsIgnoreCase(role) ? "admin" : "member";
    String hash = passwordEncoder.encode(password);
    userRepository.insertUser(name.trim(), normalizedEmail, hash, normalizedRole);
    log.warn(
        "Seeded default user email={} role={}. Change the password or set PM_SEED_DEFAULT_USER=false.",
        normalizedEmail,
        normalizedRole);
  }
}
