package com.marketmind.pmapi.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Suppresses duplicate team emails when the client sends the same task update twice in quick succession
 * (e.g. parallel PUTs / DnD + sheet race).
 */
@Service
public class TeamUpdateEmailDedupeService {
  private static final Logger log = LoggerFactory.getLogger(TeamUpdateEmailDedupeService.class);

  /** Identical payload signatures within this window only emit one email. */
  private static final long WINDOW_MS = 5000L;

  private final Map<String, Long> lastSentAt = new HashMap<>();

  /**
   * @return {@code true} if this notification should be sent (not a rapid duplicate of the same update).
   */
  public synchronized boolean allowSamePayloadWithinWindow(int taskId, int actorUserId, Map<String, Object> mergedFields) {
    String key = taskId + "|" + actorUserId + "|" + TaskChangeDetector.stableSignature(mergedFields);
    long now = System.currentTimeMillis();
    Long prev = lastSentAt.get(key);
    if (prev != null && now - prev < WINDOW_MS) {
      log.info(
          "Team email suppressed (duplicate PUT within {}ms): taskId={} actorUserId={}",
          WINDOW_MS,
          taskId,
          actorUserId
      );
      return false;
    }
    lastSentAt.put(key, now);
    if (lastSentAt.size() > 3000) {
      lastSentAt.clear();
    }
    return true;
  }
}
