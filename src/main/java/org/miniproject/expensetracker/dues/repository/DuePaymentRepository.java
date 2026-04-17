package org.miniproject.expensetracker.dues.repository;

import org.miniproject.expensetracker.dues.entity.DuePayment;
import org.miniproject.expensetracker.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DuePaymentRepository extends JpaRepository<DuePayment, Long> {

    List<DuePayment> findByUser(User user);
}