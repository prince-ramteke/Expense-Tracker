package org.miniproject.expensetracker.emi.controller;

import lombok.RequiredArgsConstructor;
import org.miniproject.expensetracker.auth.entity.User;
import org.miniproject.expensetracker.emi.entity.EmiInstallment;
import org.miniproject.expensetracker.emi.entity.EmiPlan;
import org.miniproject.expensetracker.emi.service.EmiService;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.util.List;

@RestController
@RequestMapping("/api/emis")
@RequiredArgsConstructor
public class EmiController {

    private final EmiService emiService;


    @PostMapping
    public EmiPlan createEmi(@RequestBody EmiPlan emiPlan, Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        return emiService.createEmi(user, emiPlan);
    }

    @GetMapping
    public List<EmiPlan> getEmis(Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        return emiService.getUserEmis(user);
    }

    @GetMapping("/{emiId}/installments")
    public List<EmiInstallment> getInstallments(@PathVariable Long emiId) {
        return emiService.getInstallments(emiId);
    }

    @PostMapping("/installments/{id}/pay")
    public String payInstallment(@PathVariable Long id, Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        emiService.payInstallment(id, user);

        return "Installment paid successfully";
    }
}