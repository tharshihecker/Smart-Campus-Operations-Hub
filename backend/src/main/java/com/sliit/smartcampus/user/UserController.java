package com.sliit.smartcampus.user;

import com.sliit.smartcampus.security.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/user")
public class UserController {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody User user) {
        if (user.getUsername() == null || user.getEmail() == null || user.getPassword() == null) {
            return ResponseEntity.badRequest().body("Missing required fields");
        }

        String username = user.getUsername().trim();
        String email = user.getEmail().trim();

        if (username.isEmpty() || email.isEmpty() || user.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body("Invalid signup data");
        }

        if (userRepository.findByUsernameIgnoreCase(username).isPresent() ||
            userRepository.findByEmailIgnoreCase(email).isPresent()) {
            return ResponseEntity.badRequest().body("Username or email already exists");
        }

        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setRole(UserRole.USER);
        user.setEnabled(true);
        User saved = userRepository.save(user);

        String token = jwtUtil.generateToken(saved.getUsername(), saved.getRole().name(), saved.getId());
        return ResponseEntity.ok(buildAuthResponse(saved, token));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String rawPassword = credentials.get("password");

        if (username == null || rawPassword == null) {
            return ResponseEntity.badRequest().body("Missing username or password");
        }

        return userRepository.findByUsernameIgnoreCase(username.trim())
                .filter(u -> u.isEnabled() && passwordMatches(rawPassword, u))
                .map(u -> {
                    String token = jwtUtil.generateToken(u.getUsername(), u.getRole().name(), u.getId());
                    return ResponseEntity.ok((Object) buildAuthResponse(u, token));
                })
                .orElse(ResponseEntity.status(401).body("Invalid credentials or account disabled"));
    }

    @GetMapping("/profile/{userId}")
    public ResponseEntity<?> getProfile(@PathVariable Long userId) {
        return userRepository.findById(userId)
                .map(u -> ResponseEntity.ok((Object) Map.of(
                        "id", u.getId(),
                        "username", u.getUsername(),
                        "email", u.getEmail(),
                        "fullName", u.getFullName() != null ? u.getFullName() : "",
                        "phone", u.getPhone() != null ? u.getPhone() : "",
                        "department", u.getDepartment() != null ? u.getDepartment() : "",
                        "bio", u.getBio() != null ? u.getBio() : "",
                        "role", u.getRole().name(),
                        "createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : ""
                )))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/profile/{userId}")
    public ResponseEntity<?> updateProfile(@PathVariable Long userId, @RequestBody Map<String, String> updates) {
        return userRepository.findById(userId)
                .map(u -> {
                    if (updates.containsKey("fullName")) u.setFullName(updates.get("fullName"));
                    if (updates.containsKey("phone")) u.setPhone(updates.get("phone"));
                    if (updates.containsKey("department")) u.setDepartment(updates.get("department"));
                    if (updates.containsKey("bio")) u.setBio(updates.get("bio"));
                    if (updates.containsKey("email")) {
                        String newEmail = updates.get("email").trim();
                        var existing = userRepository.findByEmailIgnoreCase(newEmail);
                        Long existingId = existing.map(User::getId).orElse(null);
                        if (existingId != null && !existingId.equals(userId)) {
                            return ResponseEntity.badRequest().body((Object) "Email already in use");
                        }
                        u.setEmail(newEmail);
                    }
                    userRepository.save(u);
                    return ResponseEntity.ok((Object) "Profile updated successfully");
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/change-password/{userId}")
    public ResponseEntity<?> changePassword(@PathVariable Long userId, @RequestBody Map<String, String> payload) {
        String currentPassword = payload.get("currentPassword");
        String newPassword = payload.get("newPassword");

        if (currentPassword == null || newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body("Invalid password data (min 6 chars)");
        }

        return userRepository.findById(userId)
                .map(u -> {
                    if (!passwordMatches(currentPassword, u)) {
                        return ResponseEntity.badRequest().body((Object) "Current password is incorrect");
                    }
                    u.setPassword(passwordEncoder.encode(newPassword));
                    userRepository.save(u);
                    return ResponseEntity.ok((Object) "Password changed successfully");
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private Map<String, Object> buildAuthResponse(User u, String token) {
        return Map.of(
                "token", token,
                "userId", Objects.requireNonNull(u.getId()),
                "username", u.getUsername(),
                "email", u.getEmail(),
                "role", u.getRole().name(),
                "fullName", u.getFullName() != null ? u.getFullName() : "",
                "department", u.getDepartment() != null ? u.getDepartment() : ""
        );
    }

    private boolean passwordMatches(String rawPassword, User user) {
        String stored = user.getPassword();
        if (stored != null && stored.startsWith("$2")) {
            return passwordEncoder.matches(rawPassword, stored);
        }
        if (rawPassword.equals(stored)) {
            user.setPassword(passwordEncoder.encode(rawPassword));
            userRepository.save(user);
            return true;
        }
        return false;
    }
}
