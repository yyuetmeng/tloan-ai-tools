package com.tloan.catalogue.tool;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AiToolRepository extends JpaRepository<AiTool, Long> {

    Optional<AiTool> findByNameIgnoreCase(String name);
}
