package com.tloan.catalogue;

/**
 * One entry in the AI Tool Catalogue ({@code catalogue/tools.json}).
 * {@code totalLicences} and {@code active} are boxed so a missing value can be told apart from 0/false.
 */
public record AiTool(
        String id,
        String name,
        String vendor,
        String category,
        String description,
        String websiteUrl,
        Integer totalLicences,
        Boolean active) {

    public boolean isActive() {
        return active == null || active;
    }
}
