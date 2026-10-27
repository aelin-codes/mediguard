package com.mediguard;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.time.LocalDate;
import java.util.List;

// Single MVC controller handling view rendering and Post/Redirect/Get actions
@Controller
public class MedicineController {

    private final MedicineManager manager;

    public MedicineController(MedicineManager manager) {
        this.manager = manager;
    }

    @GetMapping("/")
    public String index(Model model) {
        List<Reminder> allReminders = manager.getReminders();
        model.addAttribute("user", manager.getUser());
        model.addAttribute("medicines", manager.getMedicines());
        model.addAttribute("stats", manager.getStats());
        model.addAttribute("expiredReminders", allReminders.stream()
                .filter(r -> r.getType() == Reminder.Type.EXPIRED).toList());
        model.addAttribute("expiringReminders", allReminders.stream()
                .filter(r -> r.getType() == Reminder.Type.EXPIRING).toList());
        model.addAttribute("history", manager.getHistory());
        return "index";
    }

    @PostMapping("/add")
    public String add(@RequestParam(required = false) String name,
                      @RequestParam(required = false) String category,
                      @RequestParam(required = false) Integer quantity,
                      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expiryDate,
                      RedirectAttributes ra) {
        String err = manager.add(name, category, quantity, expiryDate);
        if (err != null) ra.addFlashAttribute("error", err);
        return "redirect:/";
    }

    @PostMapping("/use")
    public String markUsed(@RequestParam String id) {
        manager.markUsed(id);
        return "redirect:/";
    }

    @PostMapping("/discard")
    public String discard(@RequestParam String id) {
        manager.discard(id);
        return "redirect:/";
    }

    @PostMapping("/threshold")
    public String updateThreshold(@RequestParam(defaultValue = "30") int alertThresholdDays) {
        manager.updateThreshold(alertThresholdDays);
        return "redirect:/";
    }
}
