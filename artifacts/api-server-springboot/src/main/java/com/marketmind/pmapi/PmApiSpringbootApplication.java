package com.marketmind.pmapi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.mail.MailSenderAutoConfiguration;

@SpringBootApplication(exclude = {MailSenderAutoConfiguration.class})
public class PmApiSpringbootApplication {
  public static void main(String[] args) {
    SpringApplication.run(PmApiSpringbootApplication.class, args);
  }
}

