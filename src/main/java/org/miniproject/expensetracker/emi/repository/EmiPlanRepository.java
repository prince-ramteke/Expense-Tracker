package org.miniproject.expensetracker.emi.repository;

import org.miniproject.expensetracker.emi.entity.EmiPlan;
import org.miniproject.expensetracker.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmiPlanRepository extends JpaRepository<EmiPlan, Long> {

    List<EmiPlan> findByUser(User user);
}