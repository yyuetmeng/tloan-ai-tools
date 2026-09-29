package com.tloan.catalogue;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "catalogue.admin-key=test-key")
@AutoConfigureMockMvc
class AiToolControllerTest {

    private static final String NEW_TOOL = """
            {"name":"Midjourney","vendor":"Midjourney","category":"Image",
             "description":"Image generation","websiteUrl":"https://www.midjourney.com",
             "totalLicences":2,"active":true}
            """;

    @Autowired
    MockMvc mvc;

    @Test
    void listsSeededCatalogue() throws Exception {
        mvc.perform(get("/api/tools"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[*].name", hasItem("Claude Pro")));
    }

    @Test
    void filtersByCategoryAndSearch() throws Exception {
        mvc.perform(get("/api/tools").param("category", "design"))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Figma"));
        mvc.perform(get("/api/tools").param("q", "anthropic"))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Claude Pro"));
    }

    @Test
    void createRequiresApiKey() throws Exception {
        mvc.perform(post("/api/tools").contentType(MediaType.APPLICATION_JSON).content(NEW_TOOL))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/tools").header("X-API-Key", "wrong")
                        .contentType(MediaType.APPLICATION_JSON).content(NEW_TOOL))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createUpdateAndDeleteTool() throws Exception {
        String location = mvc.perform(post("/api/tools").header("X-API-Key", "test-key")
                        .contentType(MediaType.APPLICATION_JSON).content(NEW_TOOL))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.name").value("Midjourney"))
                .andReturn().getResponse().getHeader("Location");

        mvc.perform(put(location).header("X-API-Key", "test-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(NEW_TOOL.replace("\"active\":true", "\"active\":false")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        mvc.perform(get("/api/tools").param("active", "true")).andExpect(jsonPath("$", hasSize(4)));

        mvc.perform(delete(location).header("X-API-Key", "test-key")).andExpect(status().isNoContent());
        mvc.perform(get(location)).andExpect(status().isNotFound());
    }

    @Test
    void rejectsDuplicateAndInvalidTools() throws Exception {
        mvc.perform(post("/api/tools").header("X-API-Key", "test-key")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"claude pro\"}"))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/tools").header("X-API-Key", "test-key")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\",\"totalLicences\":-1}"))
                .andExpect(status().isBadRequest());
    }
}
