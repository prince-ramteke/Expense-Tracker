package org.miniproject.expensetracker.transaction.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionRequest {

    private String transactionType;
    private String title;
    private BigDecimal amount;
    private LocalDate transactionDate;
    private String paymentMode;
    private String note;
    private Long categoryId;


}