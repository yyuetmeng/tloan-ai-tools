package com.tloan.catalogue.tool;

public class ToolNotFoundException extends RuntimeException {

    public ToolNotFoundException(Long id) {
        super("AI tool " + id + " not found");
    }
}
