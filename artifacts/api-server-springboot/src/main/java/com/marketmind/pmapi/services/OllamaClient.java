package com.marketmind.pmapi.services;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class OllamaClient {
  private final RestTemplate restTemplate;

  @Value("${ollama.baseUrl}")
  private String baseUrl;

  @Value("${ollama.model}")
  private String model;

  @Value("${ollama.think:false}")
  private boolean think;

  public OllamaClient() {
    this.restTemplate = new RestTemplate();
  }

  public String rephraseProjectDescription(String projectName, String originalDescription) {
    String prompt = String.format(
        "Rewrite the following project description in a concise, professional tone (stakeholder-facing, no fluff).\n\n" +
            "Requirements:\n" +
            "- Be noticeably shorter than the original: tighten wording, drop repetition and filler, keep one or two crisp paragraphs at most (or a few short sentences if the source is brief).\n" +
            "- Stay formal and clear; do not pad with extra clauses or long introductions.\n" +
            "- Do not add deliverables, scope, dates, or stakeholders that are not in the original.\n\n" +
            "Output only the rewritten description as plain prose (no title line, no markdown, no bullet lists, no quotation marks wrapping the whole text).\n\n" +
            "Project name: %s\n" +
            "Original description:\n%s",
        projectName,
        originalDescription
    );

    Map<String, Object> body = new HashMap<>();
    body.put("model", model);
    body.put("messages", List.of(Map.of("role", "user", "content", prompt)));
    body.put("stream", false);
    body.put("keep_alive", "30m");
    body.put("think", think);
    body.put("options", Map.of("temperature", 0.25, "num_predict", 380));

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

    String url = baseUrl + "/api/chat";
    ResponseEntity<JsonNode> resp = restTemplate.postForEntity(url, entity, JsonNode.class);
    if (!resp.getStatusCode().is2xxSuccessful()) {
      throw new IllegalStateException("Ollama request failed: " + resp.getStatusCode());
    }

    JsonNode content = resp.getBody() != null ? resp.getBody().get("message") : null;
    if (content == null || content.get("content") == null) {
      throw new IllegalStateException("Ollama returned empty/invalid response");
    }
    return content.get("content").asText().trim();
  }
}

