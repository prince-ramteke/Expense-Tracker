package org.miniproject.expensetracker.category.repository;

import org.miniproject.expensetracker.category.entity.Category;
import org.miniproject.expensetracker.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findByUser(User user);

    List<Category> findByUserAndIsActiveTrue(User user);
}