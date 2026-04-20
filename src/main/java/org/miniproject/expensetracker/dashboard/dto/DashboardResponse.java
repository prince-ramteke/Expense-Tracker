package org.miniproject.expensetracker.dashboard.dto;

import lombok.*;
import org.miniproject.expensetracker.transaction.entity.Transaction;

import java.math.BigDecimal;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DashboardResponse {

    private BigDecimal totalIncome;
    private BigDecimal totalExpense;
    private BigDecimal balance;
    private BigDecimal pendingDues;
    private BigDecimal pendingEmi;

    private BigDecimal thisMonthIncome;
    private BigDecimal thisMonthExpense;

    private Integer emiProgress;

    private List<Transaction> recentTransactions;
}