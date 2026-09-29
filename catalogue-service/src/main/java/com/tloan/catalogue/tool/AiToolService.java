package com.tloan.catalogue.tool;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@Transactional
public class AiToolService {

    private final AiToolRepository repository;

    public AiToolService(AiToolRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<AiTool> list(String category, Boolean active, String search) {
        String needle = search == null ? null : search.toLowerCase(Locale.ROOT);
        return repository.findAll(Sort.by("name")).stream()
                .filter(t -> category == null || category.equalsIgnoreCase(t.getCategory()))
                .filter(t -> active == null || t.isActive() == active)
                .filter(t -> needle == null || matches(t, needle))
                .toList();
    }

    @Transactional(readOnly = true)
    public AiTool get(Long id) {
        return repository.findById(id).orElseThrow(() -> new ToolNotFoundException(id));
    }

    public AiTool create(AiToolRequest req) {
        ensureNameIsFree(req.name(), null);
        AiTool tool = new AiTool(req.name().trim(), null, null, null, null, 0, true);
        tool.apply(req);
        return repository.save(tool);
    }

    public AiTool update(Long id, AiToolRequest req) {
        AiTool tool = get(id);
        ensureNameIsFree(req.name(), id);
        tool.apply(req);
        return repository.save(tool);
    }

    public void delete(Long id) {
        repository.delete(get(id));
    }

    private void ensureNameIsFree(String name, Long ownId) {
        repository.findByNameIgnoreCase(name.trim())
                .filter(existing -> !existing.getId().equals(ownId))
                .ifPresent(existing -> {
                    throw new DuplicateToolException(name.trim());
                });
    }

    private static boolean matches(AiTool t, String needle) {
        return contains(t.getName(), needle) || contains(t.getVendor(), needle)
                || contains(t.getDescription(), needle);
    }

    private static boolean contains(String field, String needle) {
        return field != null && field.toLowerCase(Locale.ROOT).contains(needle);
    }
}
