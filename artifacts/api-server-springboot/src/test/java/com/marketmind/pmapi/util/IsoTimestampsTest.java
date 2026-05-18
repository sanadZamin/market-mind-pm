package com.marketmind.pmapi.util;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class IsoTimestampsTest {

  @Test
  void parseLenient_acceptsLocalIsoWithoutZone() {
    Instant instant = IsoTimestamps.parseLenient("2026-05-18T11:16:07.540653");
    assertEquals("2026-05-18T11:16:07.540653Z", instant.toString());
  }

  @Test
  void parseLenient_acceptsZulu() {
    Instant instant = IsoTimestamps.parseLenient("2026-05-18T11:16:07.540653Z");
    assertEquals("2026-05-18T11:16:07.540653Z", instant.toString());
  }

  @Test
  void fromSqlTimestamp_endsWithZ() {
    var ts = java.sql.Timestamp.valueOf("2026-05-18 11:16:07.540653");
    String iso = IsoTimestamps.fromSqlTimestamp(ts);
    assertTrue(iso.endsWith("Z"), iso);
  }
}
