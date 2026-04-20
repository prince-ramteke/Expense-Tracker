package org.miniproject.expensetracker.dues.controller;

import lombok.RequiredArgsConstructor;
import org.miniproject.expensetracker.auth.entity.User;
import org.miniproject.expensetracker.dues.entity.DuePayment;
import org.miniproject.expensetracker.dues.service.DuePaymentService;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

@RestController
@RequestMapping("/api/dues")
@RequiredArgsConstructor
public class DuePaymentController {

    private final DuePaymentService duePaymentService;

    @PostMapping
    public DuePayment createDue(@RequestBody DuePayment duePayment) {

        User user = (User) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();

        return duePaymentService.createDue(user, duePayment);
    }

    @GetMapping
    public List<DuePayment> getDues() {

        User user = (User) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();

        return duePaymentService.getUserDues(user);
    }
}