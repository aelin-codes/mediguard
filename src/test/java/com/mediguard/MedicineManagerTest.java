package com.mediguard;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class MedicineManagerTest {

    @TempDir
    Path tempDir;

    private File tempStore;
    private MedicineManager manager;

    @BeforeEach
    void setUp() {
        tempStore = tempDir.resolve("test-store.json").toFile();
        manager = new MedicineManager(tempStore);
    }

    @Test
    void testInitialSeedDemoData() {
        assertTrue(tempStore.exists());
        List<Medicine> list = manager.getMedicines();
        assertEquals(4, list.size());
    }

    @Test
    void testAddValidation() {
        assertNotNull(manager.add("", "Category", 5, LocalDate.now().plusDays(10)));
        assertNotNull(manager.add(null, "Category", 5, LocalDate.now().plusDays(10)));
        assertNotNull(manager.add("Valid", "Category", 0, LocalDate.now().plusDays(10)));
        assertNotNull(manager.add("Valid", "Category", 5, null));

        String result = manager.add("Metformin 500mg", "Diabetes", 20, LocalDate.now().plusDays(60));
        assertNull(result);
        assertEquals(5, manager.getMedicines().size());
    }

    @Test
    void testMarkUsedDecrementsQuantity() {
        manager.add("Multivitamin", "Vitamins", 3, LocalDate.now().plusDays(50));
        Medicine added = manager.getMedicines().stream()
                .filter(m -> m.getName().equals("Multivitamin"))
                .findFirst()
                .orElseThrow();

        manager.markUsed(added.getId());
        Medicine afterOne = manager.getMedicines().stream()
                .filter(m -> m.getId().equals(added.getId()))
                .findFirst()
                .orElseThrow();
        assertEquals(2, afterOne.getQuantity());

        manager.markUsed(added.getId());
        assertEquals(1, afterOne.getQuantity());

        manager.markUsed(added.getId());
        assertTrue(manager.getMedicines().stream().noneMatch(m -> m.getId().equals(added.getId())));
    }

    @Test
    void testDiscardRemovesMedicineImmediately() {
        Medicine first = manager.getMedicines().get(0);
        manager.discard(first.getId());
        assertTrue(manager.getMedicines().stream().noneMatch(m -> m.getId().equals(first.getId())));
    }

    @Test
    void testUpdateThreshold() {
        manager.updateThreshold(45);
        assertEquals(45, manager.getUser().getAlertThresholdDays());
        manager.updateThreshold(-5);
        assertEquals(1, manager.getUser().getAlertThresholdDays());
    }

    @Test
    void testGetStats() {
        Map<String, Integer> stats = manager.getStats();
        assertNotNull(stats);
        assertEquals(manager.getMedicines().size(), stats.get("total"));
        assertTrue(stats.containsKey("safe"));
        assertTrue(stats.containsKey("expiring"));
        assertTrue(stats.containsKey("expired"));
    }

    @Test
    void testRemindersIsPureQueryWithoutModifyingHistory() {
        int historySizeBefore = manager.getHistory().size();
        List<Reminder> reminders = manager.getReminders();
        assertNotNull(reminders);
        int historySizeAfter = manager.getHistory().size();
        assertEquals(historySizeBefore, historySizeAfter);
    }
}
