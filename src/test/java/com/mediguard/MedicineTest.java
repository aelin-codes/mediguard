package com.mediguard;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class MedicineTest {

    @Test
    void testMedicineExpiredStatus() {
        LocalDate past = LocalDate.now().minusDays(5);
        Medicine med = new Medicine("1", "Amox", "Antibiotic", 10, past);

        assertTrue(med.isExpired());
        assertTrue(med.getDaysLeft() < 0);
        assertEquals(Medicine.ExpiryStatus.EXPIRED, med.getStatus(30));
        assertTrue(med.getDaysLeftLabel().contains("Expired 5 days ago"));
    }

    @Test
    void testMedicineCriticalStatus() {
        LocalDate criticalDate = LocalDate.now().plusDays(4);
        Medicine med = new Medicine("2", "Insulin", "Diabetes", 1, criticalDate);

        assertFalse(med.isExpired());
        assertEquals(4, med.getDaysLeft());
        assertEquals(Medicine.ExpiryStatus.CRITICAL, med.getStatus(30));
        assertEquals("4 days left", med.getDaysLeftLabel());
    }

    @Test
    void testMedicineWarningStatus() {
        LocalDate warningDate = LocalDate.now().plusDays(20);
        Medicine med = new Medicine("3", "Cetirizine", "Allergy", 5, warningDate);

        assertFalse(med.isExpired());
        assertEquals(20, med.getDaysLeft());
        assertEquals(Medicine.ExpiryStatus.WARNING, med.getStatus(30));
        assertEquals("20 days left", med.getDaysLeftLabel());
    }

    @Test
    void testMedicineSafeStatus() {
        LocalDate safeDate = LocalDate.now().plusDays(90);
        Medicine med = new Medicine("4", "Paracetamol", "Analgesic", 20, safeDate);

        assertFalse(med.isExpired());
        assertEquals(90, med.getDaysLeft());
        assertEquals(Medicine.ExpiryStatus.SAFE, med.getStatus(30));
    }

    @Test
    void testMedicineExpiresTodayLabel() {
        LocalDate today = LocalDate.now();
        Medicine med = new Medicine("5", "Eye Drops", "Optical", 1, today);

        assertFalse(med.isExpired());
        assertEquals(0, med.getDaysLeft());
        assertEquals("Expires today", med.getDaysLeftLabel());
        assertEquals(Medicine.ExpiryStatus.CRITICAL, med.getStatus(30));
    }
}
