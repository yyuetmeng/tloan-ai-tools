package com.tloan.catalogue.config;

import com.tloan.catalogue.tool.AiTool;
import com.tloan.catalogue.tool.AiToolRepository;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds the catalogue with the original T-Loan tools the first time the database is empty.
 * Runs before the web server starts, so the first request never sees an empty catalogue.
 */
@Component
public class CatalogueSeeder implements SmartInitializingSingleton {

    private final AiToolRepository repository;

    public CatalogueSeeder(AiToolRepository repository) {
        this.repository = repository;
    }

    @Override
    public void afterSingletonsInstantiated() {
        if (repository.count() > 0) {
            return;
        }
        repository.saveAll(List.of(
                new AiTool("Claude Pro", "Anthropic", "Assistant",
                        "AI assistant for writing, analysis and coding.",
                        "https://claude.ai", 5, true),
                new AiTool("Lovable", "Lovable", "App Builder",
                        "Build web apps from natural-language prompts.",
                        "https://lovable.dev", 3, true),
                new AiTool("Figma", "Figma", "Design",
                        "Collaborative interface design with AI features.",
                        "https://www.figma.com", 3, true),
                new AiTool("Codex Pro", "OpenAI", "Coding",
                        "AI coding agent for software development tasks.",
                        "https://openai.com/codex", 3, true)));
    }
}
