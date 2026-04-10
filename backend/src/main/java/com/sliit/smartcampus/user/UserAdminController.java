package com.sliit.smartcampus.user;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/admin/users")
public class UserAdminController {
    private final UserRepository userRepository;

    public UserAdminController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<Map<String, Object>> getAllUsers(@RequestParam(required = false) String q) {
        List<User> users;
        if (q != null && !q.isBlank()) {
            users = userRepository.searchByKeyword(q.trim());
        } else {
            users = userRepository.findAll();
        }
        return users.stream().map(this::toMap).toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getUser(@PathVariable String id) {
        return userRepository.findById(id)
                .map(u -> ResponseEntity.ok(toMap(u)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/role")
    public ResponseEntity<?> updateRole(@PathVariable String id, @RequestBody Map<String, String> body) {
        return userRepository.findById(id)
                .map(u -> {
                    try {
                        UserRole newRole = UserRole.valueOf(body.get("role"));
                        u.setRole(newRole);
                        userRepository.save(u);
                        return ResponseEntity.ok(toMap(u));
                    } catch (Exception e) {
                        return ResponseEntity.badRequest().body((Object) "Invalid role");
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/toggle-status")
    public ResponseEntity<?> toggleStatus(@PathVariable String id) {
        return userRepository.findById(id)
                .map(u -> {
                    u.setEnabled(!u.isEnabled());
                    userRepository.save(u);
                    return ResponseEntity.ok(toMap(u));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable String id) {
        if (!userRepository.existsById(id)) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
        userRepository.deleteById(id);
    }

    @GetMapping("/roles")
    public UserRole[] getRoles() {
        return UserRole.values();
    }

    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        return Map.of(
                "total", userRepository.count(),
                "activeUsers", userRepository.countByEnabled(true),
                "disabledUsers", userRepository.countByEnabled(false),
                "adminCount", userRepository.countByRole(UserRole.ADMIN),
                "staffCount", userRepository.countByRole(UserRole.STAFF),
                "userCount", userRepository.countByRole(UserRole.USER)
        );
    }

    private Map<String, Object> toMap(User u) {
        return Map.of(
                "id", Objects.requireNonNull(u.getId()),
                "username", u.getUsername(),
                "email", u.getEmail(),
                "fullName", u.getFullName() != null ? u.getFullName() : "",
                "phone", u.getPhone() != null ? u.getPhone() : "",
                "department", u.getDepartment() != null ? u.getDepartment() : "",
                "role", u.getRole().name(),
                "enabled", u.isEnabled(),
                "createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : ""
        );
    }
}
