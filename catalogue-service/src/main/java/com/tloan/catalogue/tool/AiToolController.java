package com.tloan.catalogue.tool;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.List;

/**
 * Catalogue endpoints. Reads are public; writes require the X-API-Key header
 * (enforced by {@link com.tloan.catalogue.config.ApiKeyFilter}).
 */
@RestController
@RequestMapping("/api/tools")
public class AiToolController {

    private final AiToolService service;

    public AiToolController(AiToolService service) {
        this.service = service;
    }

    @GetMapping
    public List<AiTool> list(@RequestParam(required = false) String category,
                             @RequestParam(required = false) Boolean active,
                             @RequestParam(required = false, name = "q") String search) {
        return service.list(category, active, search);
    }

    @GetMapping("/{id}")
    public AiTool get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    public ResponseEntity<AiTool> create(@Valid @RequestBody AiToolRequest req) {
        AiTool created = service.create(req);
        return ResponseEntity
                .created(ServletUriComponentsBuilder.fromCurrentRequest()
                        .path("/{id}").buildAndExpand(created.getId()).toUri())
                .body(created);
    }

    @PutMapping("/{id}")
    public AiTool update(@PathVariable Long id, @Valid @RequestBody AiToolRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
