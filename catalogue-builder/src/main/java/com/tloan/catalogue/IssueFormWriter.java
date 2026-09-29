package com.tloan.catalogue;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Generates the GitHub issue form used to request a loan, so its "Tool" dropdown always
 * matches the active tools in the catalogue. The headings here ("Tool", "Purpose",
 * "Start date", "End date") are what js/loan-workflow.js parses — keep them in sync.
 */
public final class IssueFormWriter {

    private static final ObjectMapper JSON = new ObjectMapper();

    private IssueFormWriter() {
    }

    public static String render(List<AiTool> tools) {
        String options = tools.stream()
                .filter(AiTool::isActive)
                .map(t -> "        - " + quote(t.name().trim()))
                .collect(Collectors.joining("\n"));

        return """
                # GENERATED from catalogue/tools.json by catalogue-builder — do not edit by hand.
                name: AI tool loan request
                description: Request to borrow a licence for a tool in the AI Tool Catalogue.
                title: "Loan request"
                labels: ["loan-request", "status: submitted"]
                body:
                  - type: markdown
                    attributes:
                      value: |
                        Pick a tool and the dates you need it. An approver will reply on this issue;
                        you'll get GitHub notifications as it moves through
                        **Submitted → Approved/Rejected → Issued → Returned**.

                        ⚠️ This repository is public — don't include confidential details.
                  - type: dropdown
                    id: tool
                    attributes:
                      label: Tool
                      options:
                %s
                    validations:
                      required: true
                  - type: textarea
                    id: purpose
                    attributes:
                      label: Purpose
                      description: Why do you need this tool?
                    validations:
                      required: true
                  - type: input
                    id: start_date
                    attributes:
                      label: Start date
                      placeholder: YYYY-MM-DD
                    validations:
                      required: true
                  - type: input
                    id: end_date
                    attributes:
                      label: End date
                      placeholder: YYYY-MM-DD
                    validations:
                      required: true
                """.formatted(options);
    }

    /** A JSON string literal is also a valid YAML double-quoted scalar. */
    private static String quote(String s) {
        try {
            return JSON.writeValueAsString(s);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }
}
