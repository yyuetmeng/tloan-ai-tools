package com.tloan.catalogue;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/** Checks the catalogue for mistakes before anything is published. */
public final class CatalogueValidator {

    private static final Pattern ID = Pattern.compile("^[a-z0-9]+(-[a-z0-9]+)*$");
    private static final Pattern URL = Pattern.compile("^https?://\\S+$");

    private CatalogueValidator() {
    }

    /** Returns a human-readable message per problem; an empty list means the catalogue is valid. */
    public static List<String> validate(List<AiTool> tools) {
        List<String> errors = new ArrayList<>();
        if (tools == null || tools.isEmpty()) {
            errors.add("The catalogue has no tools");
            return errors;
        }
        Set<String> ids = new HashSet<>();
        Set<String> names = new HashSet<>();
        for (int i = 0; i < tools.size(); i++) {
            AiTool t = tools.get(i);
            String where = "Tool #" + (i + 1) + (isBlank(t.name()) ? "" : " (" + t.name() + ")");

            if (isBlank(t.id()) || !ID.matcher(t.id()).matches()) {
                errors.add(where + ": id must be lowercase letters, digits and dashes, e.g. \"claude-pro\"");
            } else if (!ids.add(t.id())) {
                errors.add(where + ": duplicate id \"" + t.id() + "\"");
            }

            if (isBlank(t.name())) {
                errors.add(where + ": name is required");
            } else {
                if (t.name().length() > 100) {
                    errors.add(where + ": name must be at most 100 characters");
                }
                if (!names.add(t.name().trim().toLowerCase(Locale.ROOT))) {
                    errors.add(where + ": duplicate name \"" + t.name() + "\"");
                }
            }

            if (t.totalLicences() == null || t.totalLicences() < 0) {
                errors.add(where + ": totalLicences is required and must be 0 or more");
            }
            if (!isBlank(t.websiteUrl()) && !URL.matcher(t.websiteUrl()).matches()) {
                errors.add(where + ": websiteUrl must start with http:// or https://");
            }
            if (t.description() != null && t.description().length() > 1000) {
                errors.add(where + ": description must be at most 1000 characters");
            }
        }
        if (tools.stream().noneMatch(AiTool::isActive)) {
            errors.add("At least one tool must be active, or nobody can submit a request");
        }
        return errors;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
