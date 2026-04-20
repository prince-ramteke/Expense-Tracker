package org.miniproject.expensetracker.dashboard.service;

import lombok.RequiredArgsConstructor;
import org.miniproject.expensetracker.auth.entity.User;
import org.miniproject.expensetracker.dashboard.dto.DashboardResponse;
import org.miniproject.expensetracker.transaction.entity.Transaction;
import org.miniproject.expensetracker.transaction.entity.TransactionType;
import org.miniproject.expensetracker.transaction.repository.TransactionRepository;
import org.miniproject.expensetracker.dues.repository.DuePaymentRepository;
import org.miniproject.expensetracker.emi.repository.EmiPlanRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TransactionRepository transactionRepository;
    private final DuePaymentRepository duePaymentRepository;
    private final EmiPlanRepository emiPlanRepository;

    public DashboardResponse getDashboard(User user) {

        // Total
        BigDecimal income = transactionRepository.getTotalByType(user, TransactionType.INCOME);
        BigDecimal expense = transactionRepository.getTotalByType(user, TransactionType.EXPENSE);

        // Pending
        BigDecimal dues = duePaymentRepository.getPendingDues(user);
        BigDecimal emi = emiPlanRepository.getPendingEmi(user);

        // 🔥 Monthly
        BigDecimal monthlyIncome = transactionRepository.getMonthlyTotal(user, TransactionType.INCOME);
        BigDecimal monthlyExpense = transactionRepository.getMonthlyTotal(user, TransactionType.EXPENSE);

        // 🔥 Recent Transactions
        List<Transaction> recent = transactionRepository.findTop5ByUserOrderByTransactionDateDesc(user);

        // 🔥 EMI Progress
        Integer paid = emiPlanRepository.getTotalPaid(user);
        Integer total = emiPlanRepository.getTotalInstallments(user);

        int progress = 0;
        if (total != 0) {
            progress = (paid * 100) / total;
        }

        // 🔥 FINAL RESPONSE
        return DashboardResponse.builder()
                .totalIncome(income)
                .totalExpense(expense)
                .balance(income.subtract(expense))
                .thisMonthIncome(monthlyIncome)
                .thisMonthExpense(monthlyExpense)
                .pendingDues(dues)
                .pendingEmi(emi)
                .emiProgress(progress)
                .recentTransactions(recent)
                .build();
    }
}