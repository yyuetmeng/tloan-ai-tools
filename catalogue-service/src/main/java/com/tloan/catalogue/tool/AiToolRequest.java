package com.tloan.catalogue.tool;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Payload for creating or replacing a catalogue entry. */
public record AiToolRequest(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 100) String vendor,
        @Size(max = 50) String category,
        @Size(max = 1000) String description,
        @Size(max = 500) @Pattern(regexp = "^(https?://.*)?$", message = "must be an http(s) URL") String websiteUrl,
        @Min(0) Integer totalLicences,
        Boolean active) {
}
