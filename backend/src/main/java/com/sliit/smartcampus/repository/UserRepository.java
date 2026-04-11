package com.sliit.smartcampus.repository;

import com.sliit.smartcampus.model.User;
import com.sliit.smartcampus.model.UserRole;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import java.util.List;
import java.util.Optional;
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByUsernameIgnoreCase(String username);
    Optional<User> findByEmailIgnoreCase(String email);
    List<User> findByRole(UserRole role);
    long countByRole(UserRole role);
    long countByEnabled(boolean enabled);

    @Query("{ '$or': [ { 'username': { $regex: ?0, $options: 'i' } }, { 'email': { $regex: ?0, $options: 'i' } }, { 'fullName': { $regex: ?0, $options: 'i' } } ] }")
    List<User> searchByKeyword(String keyword);
}



