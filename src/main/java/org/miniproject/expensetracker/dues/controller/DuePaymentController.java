package org.miniproject.expensetracker.dues.controller;

import lombok.RequiredArgsConstructor;
import org.miniproject.expensetracker.auth.entity.User;
import org.miniproject.expensetracker.dues.entity.DuePayment;
import org.miniproject.expensetracker.dues.service.DuePaymentService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dues")
@RequiredArgsConstructor
public class DuePaymentController {

    private final DuePaymentService duePaymentService;

    @PostMapping
    public DuePayment createDue(@RequestBody DuePayment duePayment) {

        User user = new User();
        user.setId(1L);

        return duePaymentService.createDue(user, duePayment);
    }

    @GetMapping
    public List<DuePayment> getDues() {

        User user = new User();
        user.setId(1L);

        return duePaymentService.getUserDues(user);
    }
}