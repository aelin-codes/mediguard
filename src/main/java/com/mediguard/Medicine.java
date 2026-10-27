package com.mediguard;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

// Represents a medicine item and computes expiry status dynamically
public class Medicine {

    public enum ExpiryStatus {
        EXPIRED, CRITICAL, WARNING, SAFE
    }

    private String id;
    private String name;
    private String category;
    private int quantity;
    private LocalDate expiryDate;

    public Medicine() {}

    public Medicine(String id, String name, String category, int quantity, LocalDate expiryDate) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.quantity = quantity;
        this.expiryDate = expiryDate;
    }

    @JsonIgnore
    public long getDaysLeft() {
        return ChronoUnit.DAYS.between(LocalDate.now(), expiryDate);
    }

    @JsonIgnore
    public boolean isExpired() {
        return getDaysLeft() < 0;
    }

    @JsonIgnore
    public ExpiryStatus getStatus() {
        return getStatus(30);
    }

    @JsonIgnore
    public ExpiryStatus getStatus(int warningThresholdDays) {
        long days = getDaysLeft();
        if (days < 0) return ExpiryStatus.EXPIRED;
        if (days <= 7) return ExpiryStatus.CRITICAL;
        if (days <= warningThresholdDays) return ExpiryStatus.WARNING;
        return ExpiryStatus.SAFE;
    }

    @JsonIgnore
    public String getDaysLeftLabel() {
        long days = getDaysLeft();
        if (days < 0) {
            long ago = Math.abs(days);
            return "Expired " + ago + (ago == 1 ? " day ago" : " days ago");
        }
        if (days == 0) return "Expires today";
        return days + (days == 1 ? " day left" : " days left");
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public LocalDate getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }
}
