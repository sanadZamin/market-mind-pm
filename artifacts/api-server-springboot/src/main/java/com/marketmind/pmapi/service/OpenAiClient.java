package com.marketmind.pmapi.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class OpenAiClient {
  private final RestTemplate restTemplate;
  private final ObjectMapper objectMapper;

  @Value("${openai.apiKey:}")
  private String apiKey;

  @Value("${openai.baseUrl:https://api.openai.com/v1}")
  private String baseUrl;

  @Value("${openai.model:gpt-4o-mini}")
  private String model;

  public OpenAiClient(ObjectMapper objectMapper) {
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(10_000);
    factory.setReadTimeout(180_000);
    this.restTemplate = new RestTemplate(factory);
    this.objectMapper = objectMapper;
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
    return chat(prompt, 0.25, 500);
  }

  public String rephraseTaskDescription(String taskTitle, String originalDescription) {
    String safeTitle =
        taskTitle == null || taskTitle.isBlank() ? "Untitled task" : taskTitle.trim();
    String prompt =
        "Rewrite the following task description in a concise, professional tone (clear for engineers and PMs, no fluff).\n\n"
            + "Requirements:\n"
            + "- Be noticeably shorter than the original when possible: tighten wording, drop repetition, keep one or two short paragraphs or a tight bullet-style flow as plain sentences (no markdown bullets unless the source already used them).\n"
            + "- Stay factual; do not invent scope, dates, owners, or acceptance criteria not implied by the original.\n"
            + "- Prefer imperative or direct phrasing suitable for a ticket body.\n\n"
            + "Output only the rewritten description as plain prose (no title line, no markdown headings, no quotation marks wrapping the whole text).\n\n"
            + "Task title: "
            + safeTitle
            + "\n"
            + "Original description:\n"
            + originalDescription;
    return chat(prompt, 0.25, 500);
  }

  /** Single-turn chat completion. Pass {@code maxTokens <= 0} to let the model decide the length. */
  public String chat(String prompt, double temperature, int maxTokens) {
    if (apiKey == null || apiKey.isBlank()) {
      throw new IllegalStateException("OPENAI_API_KEY is not set on the API server");
    }

    Map<String, Object> body = new HashMap<>();
    body.put("model", model);
    body.put("messages", List.of(Map.of("role", "user", "content", prompt)));
    if (supportsTemperature(model)) {
      body.put("temperature", temperature);
    }
    if (maxTokens > 0) {
      body.put("max_completion_tokens", maxTokens);
    }

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    headers.setBearerAuth(apiKey);

    JsonNode resp;
    try {
      resp = restTemplate.postForObject(
          trimTrailingSlash(baseUrl) + "/chat/completions",
          new HttpEntity<>(body, headers),
          JsonNode.class
      );
    } catch (HttpStatusCodeException e) {
      throw new IllegalStateException(
          "OpenAI " + e.getStatusCode().value() + ": " + extractErrorMessage(e.getResponseBodyAsString()), e);
    }

    JsonNode content = resp == null ? null : resp.path("choices").path(0).path("message").path("content");
    if (content == null || content.isMissingNode() || content.isNull() || content.asText().isBlank()) {
      throw new IllegalStateException("OpenAI returned an empty response");
    }
    return content.asText().trim();
  }

  // Reasoning models (o-series, gpt-5) reject any temperature other than the default.
  private static boolean supportsTemperature(String model) {
    String m = model == null ? "" : model.toLowerCase();
    return !(m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4") || m.startsWith("gpt-5"));
  }

  private String extractErrorMessage(String rawBody) {
    if (rawBody == null || rawBody.isBlank()) return "(no body)";
    try {
      JsonNode msg = objectMapper.readTree(rawBody).path("error").path("message");
      if (!msg.isMissingNode() && !msg.asText().isBlank()) return msg.asText();
    } catch (Exception ignored) {
      // fall through to raw body
    }
    return rawBody.length() > 500 ? rawBody.substring(0, 500) : rawBody;
  }

  private static String trimTrailingSlash(String url) {
    return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
  }
}
