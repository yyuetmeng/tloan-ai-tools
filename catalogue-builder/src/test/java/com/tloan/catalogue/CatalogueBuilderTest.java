package com.tloan.catalogue;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CatalogueBuilderTest {

    private static AiTool tool(String id, String name, Integer licences, Boolean active) {
        return new AiTool(id, name, "Vendor", "Category", "Description", "https://example.com", licences, active);
    }

    @Test
    void realCatalogueIsValid() throws Exception {
        List<AiTool> tools = CatalogueBuilder.MAPPER.readValue(
                Path.of("../catalogue/tools.json").toFile(),
                CatalogueBuilder.MAPPER.getTypeFactory().constructCollectionType(List.class, AiTool.class));
        assertEquals(List.of(), CatalogueValidator.validate(tools));
    }

    @Test
    void reportsEachProblem() {
        List<String> errors = CatalogueValidator.validate(List.of(
                tool("claude-pro", "Claude Pro", 5, true),
                tool("claude-pro", "claude pro", -1, true),
                new AiTool("Bad Id", "", "", "", "", "ftp://x", null, false)));

        assertTrue(errors.stream().anyMatch(e -> e.contains("duplicate id")), errors::toString);
        assertTrue(errors.stream().anyMatch(e -> e.contains("duplicate name")), errors::toString);
        assertTrue(errors.stream().anyMatch(e -> e.contains("totalLicences")), errors::toString);
        assertTrue(errors.stream().anyMatch(e -> e.contains("id must be")), errors::toString);
        assertTrue(errors.stream().anyMatch(e -> e.contains("name is required")), errors::toString);
        assertTrue(errors.stream().anyMatch(e -> e.contains("websiteUrl")), errors::toString);
    }

    @Test
    void requiresAnActiveTool() {
        List<String> errors = CatalogueValidator.validate(List.of(tool("a", "A", 1, false)));
        assertTrue(errors.stream().anyMatch(e -> e.contains("At least one tool must be active")));
    }

    @Test
    void issueFormListsOnlyActiveToolsAndQuotesNames() {
        String form = IssueFormWriter.render(List.of(
                tool("a", "Claude Pro", 1, true),
                tool("b", "Retired: \"Old\" Tool", 1, false),
                tool("c", "Tool: with # chars", 1, null)));

        assertTrue(form.contains("        - \"Claude Pro\"\n"));
        assertTrue(form.contains("        - \"Tool: with # chars\"\n"));
        assertFalse(form.contains("Retired"));
        assertTrue(form.contains("label: Start date"));
    }

    @Test
    void buildWritesOutputsOrReturnsErrors(@TempDir Path dir) throws Exception {
        Path catalogue = dir.resolve("tools.json");
        Path data = dir.resolve("site/data/tools.json");
        Path form = dir.resolve("form/loan-request.yml");

        Files.writeString(catalogue, """
                [{"id":"z-tool","name":" Zed ","totalLicences":1},
                 {"id":"a-tool","name":"Alpha","totalLicences":2,"active":false}]
                """);
        assertEquals(List.of(), CatalogueBuilder.build(catalogue, data, form));
        String json = Files.readString(data);
        assertTrue(json.indexOf("Alpha") < json.indexOf("Zed"), "sorted by name");
        assertTrue(json.contains("\"name\" : \"Zed\""), "names trimmed");
        assertTrue(Files.readString(form).contains("- \"Zed\""));

        Files.writeString(catalogue, "[{\"id\":\"x\",\"name\":\"X\",\"totalLicences\":1,\"licenses\":3}]");
        List<String> errors = CatalogueBuilder.build(catalogue, dir.resolve("other.json"), dir.resolve("other.yml"));
        assertEquals(1, errors.size());
        assertTrue(errors.get(0).contains("not valid catalogue JSON"), errors::toString);
        assertFalse(Files.exists(dir.resolve("other.json")));
    }
}
