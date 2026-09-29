package com.tloan.catalogue.tool;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;

/** A tool in the AI Tool Catalogue that staff can request to borrow. */
@Entity
@Table(name = "ai_tools")
public class AiTool {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(length = 100)
    private String vendor;

    @Column(length = 50)
    private String category;

    @Column(length = 1000)
    private String description;

    @Column(length = 500)
    private String websiteUrl;

    /** Number of licences/seats the team holds for this tool. */
    private int totalLicences;

    /** Whether the tool is currently offered for loan requests. */
    private boolean active = true;

    private Instant createdAt;
    private Instant updatedAt;

    protected AiTool() {
    }

    public AiTool(String name, String vendor, String category, String description,
                  String websiteUrl, int totalLicences, boolean active) {
        this.name = name;
        this.vendor = vendor;
        this.category = category;
        this.description = description;
        this.websiteUrl = websiteUrl;
        this.totalLicences = totalLicences;
        this.active = active;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    void apply(AiToolRequest req) {
        this.name = req.name().trim();
        this.vendor = req.vendor();
        this.category = req.category();
        this.description = req.description();
        this.websiteUrl = req.websiteUrl();
        this.totalLicences = req.totalLicences() == null ? 0 : req.totalLicences();
        this.active = req.active() == null || req.active();
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getVendor() { return vendor; }
    public String getCategory() { return category; }
    public String getDescription() { return description; }
    public String getWebsiteUrl() { return websiteUrl; }
    public int getTotalLicences() { return totalLicences; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
