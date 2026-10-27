package com.mediguard;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

// Core service managing medicines, reminders, history log, and atomic JSON persistence
@Service
public class MedicineManager {

    private static final int MAX_HISTORY = 100;
    private static final DateTimeFormatter TS_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public static class StoreData {
        public User user = new User("Household User", 30);
        public List<Medicine> medicines = new ArrayList<>();
        public List<String> history = new ArrayList<>();
    }

    private final File storeFile;
    private final ObjectMapper mapper;
    private final List<Medicine> medicines = new ArrayList<>();
    private final List<Reminder> reminders = new ArrayList<>();
    private final List<String> history = new ArrayList<>();
    private User user = new User("Household User", 30);

    public MedicineManager() {
        this(new File("./data/store.json"));
    }

    public MedicineManager(File storeFile) {
        this.storeFile = storeFile;
        this.mapper = new ObjectMapper()
                .findAndRegisterModules()
                .enable(SerializationFeature.INDENT_OUTPUT);
        load();
    }

    public synchronized String add(String name, String category, Integer quantity, LocalDate expiryDate) {
        if (name == null || name.isBlank()) return "Medicine name is required.";
        if (expiryDate == null) return "Expiry date is required.";
        if (quantity == null || quantity < 1) return "Quantity must be at least 1.";

        String cleanCat = (category == null || category.isBlank()) ? "General" : category.trim();
        Medicine med = new Medicine(
                UUID.randomUUID().toString(),
                name.trim(),
                cleanCat,
                quantity,
                expiryDate
        );
        medicines.add(med);
        logHistory("ADDED", med.getName());
        if (med.isExpired()) {
            logHistory("EXPIRED_DETECTED", med.getName());
        }
        save();
        return null;
    }

    public synchronized void markUsed(String id) {
        medicines.stream()
                .filter(m -> m.getId().equals(id))
                .findFirst()
                .ifPresent(m -> {
                    if (m.getQuantity() > 1) {
                        m.setQuantity(m.getQuantity() - 1);
                        logHistory("USED (1 unit, " + m.getQuantity() + " remaining)", m.getName());
                    } else {
                        medicines.remove(m);
                        logHistory("CONSUMED", m.getName());
                    }
                    save();
                });
    }

    public synchronized void discard(String id) {
        medicines.stream()
                .filter(m -> m.getId().equals(id))
                .findFirst()
                .ifPresent(m -> {
                    medicines.remove(m);
                    logHistory("DISCARDED", m.getName());
                    save();
                });
    }

    public synchronized void updateThreshold(int days) {
        user.setAlertThresholdDays(Math.max(1, days));
        save();
    }

    public synchronized List<Reminder> getReminders() {
        reminders.clear();
        Set<String> seen = new LinkedHashSet<>();

        medicines.sort(Comparator.comparing(Medicine::getExpiryDate));
        for (Medicine m : medicines) {
            Reminder r = Reminder.generateFor(m, user);
            if (r != null && seen.add(r.getType() + ":" + r.getMedicineName())) {
                reminders.add(r);
            }
        }
        return new ArrayList<>(reminders);
    }

    public synchronized Map<String, Integer> getStats() {
        int total = medicines.size();
        int safe = 0, expiring = 0, expired = 0;
        for (Medicine m : medicines) {
            Medicine.ExpiryStatus st = m.getStatus(user.getAlertThresholdDays());
            if (st == Medicine.ExpiryStatus.EXPIRED) expired++;
            else if (st == Medicine.ExpiryStatus.SAFE) safe++;
            else expiring++;
        }
        Map<String, Integer> stats = new LinkedHashMap<>();
        stats.put("total", total);
        stats.put("safe", safe);
        stats.put("expiring", expiring);
        stats.put("expired", expired);
        return stats;
    }

    public synchronized List<Medicine> getMedicines() {
        medicines.sort(Comparator.comparing(Medicine::getExpiryDate));
        return new ArrayList<>(medicines);
    }

    public synchronized List<String> getHistory() {
        return new ArrayList<>(history);
    }

    public synchronized User getUser() {
        return user;
    }

    private void logHistory(String action, String medicineName) {
        history.add(0, "[" + LocalDateTime.now().format(TS_FMT) + "] " + action + " — " + medicineName);
        while (history.size() > MAX_HISTORY) {
            history.remove(history.size() - 1);
        }
    }

    public final synchronized void load() {
        if (!storeFile.exists()) {
            seedDemoData();
            save();
            return;
        }
        try {
            StoreData data = mapper.readValue(storeFile, StoreData.class);
            if (data.user != null) this.user = data.user;
            this.medicines.clear();
            if (data.medicines != null) this.medicines.addAll(data.medicines);
            this.history.clear();
            if (data.history != null) this.history.addAll(data.history);
        } catch (IOException e) {
            seedDemoData();
            save();
        }
    }

    public final synchronized void save() {
        try {
            Path targetPath = storeFile.toPath();
            Path parent = targetPath.getParent();
            if (parent != null && !Files.exists(parent)) {
                Files.createDirectories(parent);
            }
            Path tempFile = Files.createTempFile(parent != null ? parent : Paths.get("."), "store-", ".tmp");
            StoreData data = new StoreData();
            data.user = this.user;
            data.medicines = this.medicines;
            data.history = this.history;
            mapper.writeValue(tempFile.toFile(), data);
            try {
                Files.move(tempFile, targetPath, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            } catch (AtomicMoveNotSupportedException e) {
                Files.move(tempFile, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            System.err.println("Warning: failed to persist store data: " + e.getMessage());
        }
    }

    private void seedDemoData() {
        LocalDate today = LocalDate.now();
        medicines.clear();
        history.clear();

        Medicine m1 = new Medicine(UUID.randomUUID().toString(), "Amoxicillin 500mg", "Antibiotic", 10, today.minusDays(5));
        Medicine m2 = new Medicine(UUID.randomUUID().toString(), "Insulin Glargine Pen", "Diabetes", 2, today.plusDays(4));
        Medicine m3 = new Medicine(UUID.randomUUID().toString(), "Cetirizine 10mg", "Antihistamine", 15, today.plusDays(20));
        Medicine m4 = new Medicine(UUID.randomUUID().toString(), "Paracetamol 650mg", "Analgesic", 30, today.plusDays(180));

        medicines.addAll(List.of(m1, m2, m3, m4));
        for (Medicine m : medicines) {
            logHistory("ADDED", m.getName());
            if (m.isExpired()) logHistory("EXPIRED_DETECTED", m.getName());
        }
    }
}
