package com.mediguard;

// Represents the household user and their custom warning threshold
public class User {
    private String name;
    private int alertThresholdDays;

    public User() {
        this("Household User", 30);
    }

    public User(String name, int alertThresholdDays) {
        this.name = name;
        this.alertThresholdDays = Math.max(1, alertThresholdDays);
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public int getAlertThresholdDays() { return alertThresholdDays; }
    public void setAlertThresholdDays(int alertThresholdDays) {
        this.alertThresholdDays = Math.max(1, alertThresholdDays);
    }
}
