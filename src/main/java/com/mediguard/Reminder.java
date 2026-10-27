package com.mediguard;

// Auto-generated alert message for expired or expiring medicines
public class Reminder {

    public enum Type {
        EXPIRING, EXPIRED
    }

    private String medicineName;
    private Type type;
    private String message;

    public Reminder() {}

    public Reminder(String medicineName, Type type, String message) {
        this.medicineName = medicineName;
        this.type = type;
        this.message = message;
    }

    public static Reminder generateFor(Medicine m, User user) {
        Medicine.ExpiryStatus status = m.getStatus(user.getAlertThresholdDays());
        if (status == Medicine.ExpiryStatus.EXPIRED) {
            return new Reminder(
                m.getName(),
                Type.EXPIRED,
                m.getName() + " (" + m.getCategory() + ") — " + m.getDaysLeftLabel() + ". Do not use!"
            );
        }
        if (status == Medicine.ExpiryStatus.CRITICAL || status == Medicine.ExpiryStatus.WARNING) {
            return new Reminder(
                m.getName(),
                Type.EXPIRING,
                m.getName() + " (" + m.getCategory() + ", Qty: " + m.getQuantity() + ") — "
                    + m.getDaysLeftLabel() + " [" + status + "]"
            );
        }
        return null;
    }

    public String getMedicineName() { return medicineName; }
    public Type getType() { return type; }
    public String getMessage() { return message; }
}
