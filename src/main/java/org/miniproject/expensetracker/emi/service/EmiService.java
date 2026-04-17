package org.miniproject.expensetracker.emi.service;

import lombok.RequiredArgsConstructor;
import org.miniproject.expensetracker.auth.entity.User;
import org.miniproject.expensetracker.emi.entity.EmiInstallment;
import org.miniproject.expensetracker.emi.entity.EmiPlan;
import org.miniproject.expensetracker.emi.entity.EmiStatus;
import org.miniproject.expensetracker.emi.entity.InstallmentStatus;
import org.miniproject.expensetracker.emi.repository.EmiInstallmentRepository;
import org.miniproject.expensetracker.emi.repository.EmiPlanRepository;
import org.miniproject.expensetracker.exception.CustomException;
import org.miniproject.expensetracker.transaction.dto.TransactionRequest;
import org.miniproject.expensetracker.transaction.service.TransactionService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmiService {

    private final EmiPlanRepository emiPlanRepository;

    private final EmiInstallmentRepository emiInstallmentRepository;

    private final TransactionService transactionService;

    public EmiPlan createEmi(User user, EmiPlan emiPlan) {

        emiPlan.setUser(user);

        // Save EMI Plan first
        EmiPlan savedPlan = emiPlanRepository.save(emiPlan);

        // 🔥 Generate Installments
        for (int i = 1; i <= savedPlan.getTotalInstallments(); i++) {

            EmiInstallment installment = EmiInstallment.builder()
                    .emiPlan(savedPlan)
                    .installmentNo(i)
                    .amount(savedPlan.getEmiAmount())
                    .dueDate(savedPlan.getStartDate().plusMonths(i - 1))
                    .status(InstallmentStatus.PENDING)
                    .build();

            emiInstallmentRepository.save(installment);
        }

        return savedPlan;
    }

    public List<EmiPlan> getUserEmis(User user) {
        return emiPlanRepository.findByUser(user);
    }

    public List<EmiInstallment> getInstallments(Long emiId) {

        EmiPlan emi = emiPlanRepository.findById(emiId)
                .orElseThrow(() -> new CustomException("EMI not found"));

        return emiInstallmentRepository.findByEmiPlan(emi);
    }

    public void payInstallment(Long installmentId, User user) {

        // 1. Fetch installment
        EmiInstallment installment = emiInstallmentRepository.findById(installmentId)
                .orElseThrow(() -> new CustomException("Installment not found"));

        // 2. Security check (VERY IMPORTANT)
        if (!installment.getEmiPlan().getUser().getId().equals(user.getId())) {
            throw new CustomException("Unauthorized access");
        }

        // 3. Already paid check
        if (installment.getStatus() == InstallmentStatus.PAID) {
            throw new CustomException("Installment already paid");        }

        // 4. Mark as PAID
        installment.setStatus(InstallmentStatus.PAID);
        installment.setPaidDate(java.time.LocalDate.now());

        emiInstallmentRepository.save(installment);

        // 🔥 AUTO CREATE TRANSACTION

        TransactionRequest request = TransactionRequest.builder()
                .transactionType("EXPENSE")
                .title("EMI - " + installment.getEmiPlan().getLoanName())
                .amount(installment.getAmount())
                .transactionDate(java.time.LocalDate.now())
                .paymentMode("AUTO") // must match enum
                .note("Auto EMI payment")
                .build();

        transactionService.createFromEmi(user, request);

        // 5. Update EMI PLAN
        EmiPlan emiPlan = installment.getEmiPlan();

        int currentPaid = emiPlan.getPaidInstallments() == null ? 0 : emiPlan.getPaidInstallments();
        int paid = currentPaid + 1;
        emiPlan.setPaidInstallments(paid);

        // 6. If all paid → COMPLETE EMI
        if (paid >= emiPlan.getTotalInstallments()) {
            emiPlan.setStatus(EmiStatus.COMPLETED);
        }

        emiPlanRepository.save(emiPlan);
    }
}