package com.tloan.catalogue;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;

/**
 * Command-line entry point, run by GitHub Actions:
 * <pre>
 * java -jar catalogue-builder.jar &lt;tools.json&gt; &lt;site-data.json&gt; &lt;issue-form.yml&gt;
 * </pre>
 * Validates the catalogue, then writes the JSON the GitHub Pages site reads and the
 * loan request issue form. Exits with status 1 if the catalogue is invalid.
 */
public final class CatalogueBuilder {

    static final ObjectMapper MAPPER = new ObjectMapper()
            .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .enable(SerializationFeature.INDENT_OUTPUT);

    private CatalogueBuilder() {
    }

    public static void main(String[] args) throws IOException {
        if (args.length != 3) {
            System.err.println("Usage: java -jar catalogue-builder.jar <tools.json> <site-data.json> <issue-form.yml>");
            System.exit(2);
        }
        List<String> errors = build(Path.of(args[0]), Path.of(args[1]), Path.of(args[2]));
        if (!errors.isEmpty()) {
            System.err.println("Catalogue is invalid:");
            errors.forEach(e -> System.err.println("  - " + e));
            System.exit(1);
        }
        System.out.println("Catalogue OK: wrote " + args[1] + " and " + args[2]);
    }

    /** Returns validation errors; outputs are written only when there are none. */
    static List<String> build(Path catalogue, Path siteData, Path issueForm) throws IOException {
        List<AiTool> tools;
        try {
            tools = MAPPER.readValue(catalogue.toFile(), new TypeReference<>() { });
        } catch (JsonProcessingException e) {
            return List.of(catalogue + " is not valid catalogue JSON: " + e.getOriginalMessage());
        }
        List<String> errors = CatalogueValidator.validate(tools);
        if (!errors.isEmpty()) {
            return errors;
        }

        List<AiTool> sorted = tools.stream()
                .map(t -> new AiTool(t.id(), t.name().trim(), t.vendor(), t.category(), t.description(),
                        t.websiteUrl(), t.totalLicences(), t.isActive()))
                .sorted(Comparator.comparing(t -> t.name().toLowerCase()))
                .toList();

        createParent(siteData);
        MAPPER.writeValue(siteData.toFile(), sorted);
        createParent(issueForm);
        Files.writeString(issueForm, IssueFormWriter.render(sorted), StandardCharsets.UTF_8);
        return List.of();
    }

    private static void createParent(Path file) throws IOException {
        Path parent = file.toAbsolutePath().getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }
    }
}
