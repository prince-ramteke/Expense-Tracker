package org.miniproject.expensetracker.emi.repository;

import org.miniproject.expensetracker.emi.entity.EmiInstallment;
import org.miniproject.expensetracker.emi.entity.EmiPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmiInstallmentRepository extends JpaRepository<EmiInstallment, Long> {

    List<EmiInstallment> findByEmiPlan(EmiPlan emiPlan);
}