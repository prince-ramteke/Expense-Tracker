package org.miniproject.expensetracker.transaction.controller;

import lombok.RequiredArgsConstructor;
import org.miniproject.expensetracker.auth.entity.User;
import org.miniproject.expensetracker.transaction.dto.TransactionRequest;
import org.miniproject.expensetracker.transaction.entity.Transaction;
import org.miniproject.expensetracker.transaction.service.TransactionService;
import org.springframework.web.bind.annotation.*;

import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;


    @PostMapping
    public Transaction addTransaction(@RequestBody TransactionRequest request) {

        User user = (User) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();

        return transactionService.addTransaction(user, request);
    }

    @GetMapping
    public List<Transaction> getTransactions() {

        User user = (User) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();

        return transactionService.getAllTransactions(user);
    }

}