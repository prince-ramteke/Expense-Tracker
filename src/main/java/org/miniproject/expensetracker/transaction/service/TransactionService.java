    package org.miniproject.expensetracker.transaction.service;

    import lombok.RequiredArgsConstructor;
    import org.miniproject.expensetracker.auth.entity.User;
    import org.miniproject.expensetracker.transaction.dto.TransactionRequest;
    import org.miniproject.expensetracker.transaction.entity.PaymentMode;
    import org.miniproject.expensetracker.transaction.entity.Transaction;
    import org.miniproject.expensetracker.transaction.entity.TransactionType;
    import org.miniproject.expensetracker.transaction.repository.TransactionRepository;
    import org.springframework.stereotype.Service;

    import org.miniproject.expensetracker.category.repository.CategoryRepository;
    import org.miniproject.expensetracker.category.entity.Category;

    import java.time.LocalDate;
    import java.util.List;

    @Service
    @RequiredArgsConstructor
    public class TransactionService {

        private final TransactionRepository transactionRepository;
        private final CategoryRepository categoryRepository;

        public Transaction addTransaction(User user, TransactionRequest request) {

            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Category not found"));

            // 🔐 SECURITY CHECK
            if (!category.getUser().getId().equals(user.getId())) {
                throw new RuntimeException("Unauthorized category access");
            }

            Transaction transaction = Transaction.builder()
                    .transactionType(TransactionType.valueOf(request.getTransactionType()))
                    .title(request.getTitle())
                    .amount(request.getAmount())
                    .transactionDate(request.getTransactionDate())
                    .paymentMode(PaymentMode.valueOf(request.getPaymentMode()))
                    .note(request.getNote())
                    .category(category)
                    .user(user)
                    .build();

            return transactionRepository.save(transaction);
        }

        public List<Transaction> getAllTransactions(User user) {
            return transactionRepository.findByUser(user);
        }

        public List<Transaction> getTransactionsByDateRange(
                User user,
                LocalDate startDate,
                LocalDate endDate
        ) {
            return transactionRepository.findByUserAndTransactionDateBetween(
                    user,
                    startDate,
                    endDate
            );
        }


        public void createFromEmi(User user, TransactionRequest request) {

            Transaction transaction = new Transaction();

            transaction.setUser(user);
            transaction.setTransactionType(TransactionType.valueOf(request.getTransactionType()));
            transaction.setTitle(request.getTitle());
            transaction.setAmount(request.getAmount());
            transaction.setTransactionDate(request.getTransactionDate());
            transaction.setPaymentMode(PaymentMode.valueOf(request.getPaymentMode()));
            transaction.setNote(request.getNote());

            transactionRepository.save(transaction);
        }
    }