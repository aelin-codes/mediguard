package com.mediguard;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class ReminderTest {

    @Test
    void testGenerateForExpiredMedicine() {
        User user = new User("Test User", 30);
        Medicine med = new Medicine("1", "Ibuprofen", "Pain", 10, LocalDate.now().minusDays(2));

        Reminder reminder = Reminder.generateFor(med, user);

        assertNotNull(reminder);
        assertEquals(Reminder.Type.EXPIRED, reminder.getType());
        assertEquals("Ibuprofen", reminder.getMedicineName());
        assertTrue(reminder.getMessage().contains("Do not use!"));
    }

    @Test
    void testGenerateForExpiringMedicine() {
        User user = new User("Test User", 30);
        Medicine med = new Medicine("2", "Aspirin", "Cardio", 5, LocalDate.now().plusDays(10));

        Reminder reminder = Reminder.generateFor(med, user);

        assertNotNull(reminder);
        assertEquals(Reminder.Type.EXPIRING, reminder.getType());
        assertEquals("Aspirin", reminder.getMedicineName());
        assertTrue(reminder.getMessage().contains("Qty: 5"));
    }

    @Test
    void testGenerateForSafeMedicineReturnsNull() {
        User user = new User("Test User", 30);
        Medicine med = new Medicine("3", "Vitamin D", "Supplements", 60, LocalDate.now().plusDays(120));

        Reminder reminder = Reminder.generateFor(med, user);

        assertNull(reminder);
    }
}
