package com.marketmind.pmapi.controllers;

import com.marketmind.pmapi.models.User;
import com.marketmind.pmapi.repositories.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/users")
public class UsersController {
  private final UserRepository userRepository;

  public UsersController(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @GetMapping
  public List<User> listUsers() {
    return userRepository.listUsers();
  }
}

