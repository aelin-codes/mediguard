package com.mediguard;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.Map;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MedicineController.class)
class MedicineControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MedicineManager manager;

    @Test
    void testIndexRoute() throws Exception {
        when(manager.getUser()).thenReturn(new User("Household User", 30));
        when(manager.getMedicines()).thenReturn(Collections.emptyList());
        when(manager.getReminders()).thenReturn(Collections.emptyList());
        when(manager.getStats()).thenReturn(Map.of("total", 0, "safe", 0, "expiring", 0, "expired", 0));
        when(manager.getHistory()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(view().name("index"))
                .andExpect(model().attributeExists("user", "medicines", "stats", "history"));
    }

    @Test
    void testAddMedicineRedirects() throws Exception {
        mockMvc.perform(post("/add")
                        .param("name", "Amoxicillin")
                        .param("category", "Antibiotic")
                        .param("quantity", "10")
                        .param("expiryDate", "2026-12-31"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/"));
    }

    @Test
    void testMarkUsedRedirects() throws Exception {
        mockMvc.perform(post("/use").param("id", "test-id-123"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/"));

        verify(manager).markUsed("test-id-123");
    }

    @Test
    void testDiscardRedirects() throws Exception {
        mockMvc.perform(post("/discard").param("id", "test-id-456"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/"));

        verify(manager).discard("test-id-456");
    }

    @Test
    void testUpdateThresholdRedirects() throws Exception {
        mockMvc.perform(post("/threshold").param("alertThresholdDays", "45"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/"));

        verify(manager).updateThreshold(45);
    }
}
