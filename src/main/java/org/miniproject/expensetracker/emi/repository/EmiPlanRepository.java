package org.miniproject.expensetracker.emi.repository;

import org.miniproject.expensetracker.emi.entity.EmiPlan;
import org.miniproject.expensetracker.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;

public interface EmiPlanRepository extends JpaRepository<EmiPlan, Long> {

    List<EmiPlan> findByUser(User user);

    @Query("SELECT COALESCE(SUM((e.totalInstallments - e.paidInstallments) * e.emiAmount),0) FROM EmiPlan e WHERE e.user = :user AND e.status = 'ACTIVE'")
    BigDecimal getPendingEmi(User user);

    @Query("SELECT COALESCE(SUM(e.paidInstallments),0) FROM EmiPlan e WHERE e.user = :user")
    Integer getTotalPaid(User user);

    @Query("SELECT COALESCE(SUM(e.totalInstallments),0) FROM EmiPlan e WHERE e.user = :user")
    Integer getTotalInstallments(User user);
}