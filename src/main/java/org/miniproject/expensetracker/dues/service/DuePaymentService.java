package org.miniproject.expensetracker.dues.service;

import lombok.RequiredArgsConstructor;
import org.miniproject.expensetracker.auth.entity.User;
import org.miniproject.expensetracker.dues.entity.DuePayment;
import org.miniproject.expensetracker.dues.repository.DuePaymentRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DuePaymentService {

    private final DuePaymentRepository duePaymentRepository;

    public DuePayment createDue(User user, DuePayment duePayment) {
        duePayment.setUser(user);
        return duePaymentRepository.save(duePayment);
    }

    public List<DuePayment> getUserDues(User user) {
        return duePaymentRepository.findByUser(user);
    }
}