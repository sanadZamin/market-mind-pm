package com.marketmind.pmapi.config;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.marketmind.pmapi.util.IsoTimestamps;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.time.Instant;

@Configuration
public class JacksonConfig {

  @Bean
  public Jackson2ObjectMapperBuilderCustomizer jacksonCustomizer() {
    SimpleModule module = new SimpleModule();
    module.addDeserializer(Instant.class, new LenientInstantDeserializer());
    module.addSerializer(Instant.class, new InstantIsoSerializer());
    return builder -> builder.modules(module);
  }

  static final class LenientInstantDeserializer extends JsonDeserializer<Instant> {
    @Override
    public Instant deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
      String text = p.getValueAsString();
      if (text == null || text.isBlank()) {
        return null;
      }
      return IsoTimestamps.parseLenient(text);
    }
  }

  static final class InstantIsoSerializer extends JsonSerializer<Instant> {
    @Override
    public void serialize(Instant value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
      if (value == null) {
        gen.writeNull();
        return;
      }
      gen.writeString(value.toString());
    }
  }
}
