package org.miniproject.expensetracker.category.service;

import lombok.RequiredArgsConstructor;
import org.miniproject.expensetracker.auth.entity.User;
import org.miniproject.expensetracker.category.entity.Category;
import org.miniproject.expensetracker.category.repository.CategoryRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public Category createCategory(User user, Category category) {
        category.setUser(user);
        return categoryRepository.save(category);
    }

    public List<Category> getUserCategories(User user) {
        return categoryRepository.findByUserAndIsActiveTrue(user);
    }
}