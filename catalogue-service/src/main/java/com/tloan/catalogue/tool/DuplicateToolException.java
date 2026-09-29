package com.tloan.catalogue.tool;

public class DuplicateToolException extends RuntimeException {

    public DuplicateToolException(String name) {
        super("An AI tool named '" + name + "' already exists");
    }
}
