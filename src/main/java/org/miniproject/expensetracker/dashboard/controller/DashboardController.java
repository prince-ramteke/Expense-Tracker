package org.miniproject.expensetracker.dashboard.controller;

import lombok.RequiredArgsConstructor;
import org.miniproject.expensetracker.auth.entity.User;
import org.miniproject.expensetracker.dashboard.dto.DashboardResponse;
import org.miniproject.expensetracker.dashboard.service.DashboardService;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.context.SecurityContextHolder;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public DashboardResponse getDashboard() {

        User user = (User) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();

        return dashboardService.getDashboard(user);
    }
}