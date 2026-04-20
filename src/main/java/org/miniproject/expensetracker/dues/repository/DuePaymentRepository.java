package org.miniproject.expensetracker.dues.repository;

import org.miniproject.expensetracker.dues.entity.DuePayment;
import org.miniproject.expensetracker.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;

public interface DuePaymentRepository extends JpaRepository<DuePayment, Long> {

    List<DuePayment> findByUser(User user);

    @Query("SELECT COALESCE(SUM(d.amount),0) FROM DuePayment d WHERE d.user = :user AND d.status = 'PENDING'")
    BigDecimal getPendingDues(User user);
}