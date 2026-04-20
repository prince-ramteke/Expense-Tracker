package org.miniproject.expensetracker.transaction.repository;

import org.miniproject.expensetracker.transaction.entity.Transaction;
import org.miniproject.expensetracker.auth.entity.User;
import org.miniproject.expensetracker.transaction.entity.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUser(User user);

    List<Transaction> findByUserAndTransactionDateBetween(
            User user,
            LocalDate startDate,
            LocalDate endDate
    );


    @Query("SELECT COALESCE(SUM(t.amount),0) FROM Transaction t WHERE t.user = :user AND t.transactionType = :type")
    BigDecimal getTotalByType(User user, TransactionType type);

    @Query("SELECT COALESCE(SUM(t.amount),0) FROM Transaction t WHERE t.user = :user AND t.transactionType = :type AND MONTH(t.transactionDate) = MONTH(CURRENT_DATE)")
    BigDecimal getMonthlyTotal(User user, TransactionType type);

    List<Transaction> findTop5ByUserOrderByTransactionDateDesc(User user);
}