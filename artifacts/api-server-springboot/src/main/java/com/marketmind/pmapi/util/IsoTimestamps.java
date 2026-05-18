package com.marketmind.pmapi.util;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;

/**
 * ISO-8601 instants for API JSON ({@code ...Z}). PostgreSQL {@code timestamp} values and
 * clients often send local datetimes without a zone; {@link #parseLenient(String)} accepts both.
 */
public final class IsoTimestamps {
  private IsoTimestamps() {}

  /** Serialize a SQL timestamp as an ISO-8601 instant string (always ends with {@code Z}). */
  public static String fromSqlTimestamp(Timestamp ts) {
    if (ts == null) {
      return null;
    }
    return ts.toInstant().toString();
  }

  /**
   * Parse timestamps from JSON or legacy DB strings.
   * Accepts {@code 2026-05-18T11:16:07.540653Z}, offsets, or local ISO without zone (UTC).
   */
  public static Instant parseLenient(String raw) {
    if (raw == null) {
      return null;
    }
    String text = raw.trim();
    if (text.isEmpty()) {
      return null;
    }
    try {
      return Instant.parse(text);
    } catch (DateTimeParseException ignored) {
      // continue
    }
    try {
      return OffsetDateTime.parse(text).toInstant();
    } catch (DateTimeParseException ignored) {
      // continue
    }
    return LocalDateTime.parse(text).toInstant(ZoneOffset.UTC);
  }
}
