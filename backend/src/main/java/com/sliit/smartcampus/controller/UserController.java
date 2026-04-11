package com.sliit.smartcampus.controller;

import com.sliit.smartcampus.model.Notification;
import com.sliit.smartcampus.model.User;
import com.sliit.smartcampus.model.UserRole;
import com.sliit.smartcampus.repository.UserRepository;
import com.sliit.smartcampus.security.JwtUtil;
import com.sliit.smartcampus.service.EmailService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Objects;
@RestController
@RequestMapping("/api/user")
public class UserController {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil, EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
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

        String identifier = username.trim();
        return userRepository.findByUsernameIgnoreCase(identifier)
                .or(() -> userRepository.findByEmailIgnoreCase(identifier))
                .filter(u -> u.isEnabled() && passwordMatches(rawPassword, u))
                .map(u -> {
                    String token = jwtUtil.generateToken(u.getUsername(), u.getRole().name(), u.getId());
                    return ResponseEntity.ok((Object) buildAuthResponse(u, token));
                })
                .orElse(ResponseEntity.status(401).body("Invalid credentials or account disabled"));
    }

    @GetMapping("/profile/{userId}")
    public ResponseEntity<?> getProfile(@PathVariable String userId) {
        return userRepository.findById(userId)
                .map(u -> ResponseEntity.ok((Object) buildProfileMap(u)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/profile/{userId}")
    public ResponseEntity<?> updateProfile(@PathVariable String userId, @RequestBody Map<String, Object> updates) {
        return userRepository.findById(userId)
                .map(u -> {
                    if (updates.containsKey("fullName")) {
                        Object val = updates.get("fullName");
                        u.setFullName(val != null ? val.toString() : "");
                    }
                    if (updates.containsKey("phone")) {
                        Object val = updates.get("phone");
                        u.setPhone(val != null ? val.toString() : "");
                    }
                    if (updates.containsKey("department")) {
                        Object val = updates.get("department");
                        u.setDepartment(val != null ? val.toString() : "");
                    }
                    if (updates.containsKey("bio")) {
                        Object val = updates.get("bio");
                        u.setBio(val != null ? val.toString() : "");
                    }
                    if (updates.containsKey("email")) {
                        Object val = updates.get("email");
                        if (val != null) {
                            String newEmail = val.toString().trim();
                            var existing = userRepository.findByEmailIgnoreCase(newEmail);
                            String existingId = existing.map(User::getId).orElse(null);
                            if (existingId != null && !existingId.equals(userId)) {
                                return ResponseEntity.badRequest().body((Object) "Email already in use");
                            }
                            u.setEmail(newEmail);
                        }
                    }
                    User saved = userRepository.save(u);
                    return ResponseEntity.ok((Object) buildProfileMap(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/change-password/{userId}")
    public ResponseEntity<?> changePassword(@PathVariable String userId, @RequestBody Map<String, String> payload) {
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

    @PostMapping("/generate-otp/{userId}")
    public ResponseEntity<?> generateOtp(@PathVariable String userId) {
        return userRepository.findById(userId)
            .map(u -> {
                String otp = String.format("%06d", new SecureRandom().nextInt(999999));
                u.setOtp(otp);
                u.setOtpExpiry(LocalDateTime.now().plusMinutes(10));
                userRepository.save(u);
                
                emailService.sendPasswordResetOtp(u, otp);
                
                return ResponseEntity.ok((Object) Map.of("message", "OTP sent to email"));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/reset-password-otp/{userId}")
    public ResponseEntity<?> resetPasswordOtp(@PathVariable String userId, @RequestBody Map<String, String> payload) {
        String otp = payload.get("otp");
        String newPassword = payload.get("newPassword");
        
        if (otp == null || newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body("Invalid input (OTP + min 6 char password required)");
        }

        return userRepository.findById(userId)
            .map(u -> {
                if (u.getOtp() == null || u.getOtpExpiry() == null) return ResponseEntity.badRequest().body((Object) "No OTP requested");
                if (LocalDateTime.now().isAfter(u.getOtpExpiry())) return ResponseEntity.badRequest().body((Object) "OTP expired");
                if (!u.getOtp().equals(otp)) return ResponseEntity.badRequest().body((Object) "Invalid OTP");
                
                u.setPassword(passwordEncoder.encode(newPassword));
                u.setOtp(null);
                u.setOtpExpiry(null);
                userRepository.save(u);
                
                return ResponseEntity.ok((Object) Map.of("message", "Password changed successfully"));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/forgot-password-request")
    public ResponseEntity<?> forgotPasswordRequest(@RequestBody Map<String, String> payload) {
        String identifier = payload.get("email"); // Can be email or username
        if (identifier == null || identifier.isBlank()) return ResponseEntity.badRequest().body("Email or Username is required");

        return userRepository.findByEmailIgnoreCase(identifier.trim())
            .or(() -> userRepository.findByUsernameIgnoreCase(identifier.trim()))
            .map(u -> {
                String otp = String.format("%06d", new SecureRandom().nextInt(999999));
                u.setOtp(otp);
                u.setOtpExpiry(LocalDateTime.now().plusMinutes(10));
                userRepository.save(u);
                
                emailService.sendPasswordResetOtp(u, otp);
                return ResponseEntity.ok((Object) Map.of("message", "OTP sent to email", "userId", u.getId()));
            })
            .orElse(ResponseEntity.status(404).body((Object) "No user found with this identifier"));
    }

    @PostMapping("/forgot-password-reset")
    public ResponseEntity<?> forgotPasswordReset(@RequestBody Map<String, String> payload) {
        String userId = payload.get("userId");
        String otp = payload.get("otp");
        String newPassword = payload.get("newPassword");

        if (userId == null || otp == null || newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body("Invalid input data");
        }

        return userRepository.findById(userId)
            .map(u -> {
                if (u.getOtp() == null || u.getOtpExpiry() == null) return ResponseEntity.badRequest().body((Object) "No OTP requested");
                if (LocalDateTime.now().isAfter(u.getOtpExpiry())) return ResponseEntity.badRequest().body((Object) "OTP expired");
                if (!u.getOtp().equals(otp)) return ResponseEntity.badRequest().body((Object) "Invalid OTP");

                u.setPassword(passwordEncoder.encode(newPassword));
                u.setOtp(null);
                u.setOtpExpiry(null);
                userRepository.save(u);
                return ResponseEntity.ok((Object) "Password reset successfully");
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/notification-prefs/{userId}")
    public ResponseEntity<?> updateNotificationPrefs(@PathVariable String userId,
                                                      @RequestBody Map<String, Boolean> prefs) {
        return userRepository.findById(userId)
                .map(u -> {
                    if (prefs.containsKey("notifBookingUpdates")) u.setNotifBookingUpdates(prefs.get("notifBookingUpdates"));
                    if (prefs.containsKey("notifTicketUpdates")) u.setNotifTicketUpdates(prefs.get("notifTicketUpdates"));
                    if (prefs.containsKey("notifComments")) u.setNotifComments(prefs.get("notifComments"));
                    User saved = userRepository.save(u);
                    return ResponseEntity.ok((Object) buildProfileMap(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private Map<String, Object> buildProfileMap(User u) {
        Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", u.getId());
        map.put("username", u.getUsername());
        map.put("email", u.getEmail());
        map.put("fullName", u.getFullName() != null ? u.getFullName() : "");
        map.put("phone", u.getPhone() != null ? u.getPhone() : "");
        map.put("department", u.getDepartment() != null ? u.getDepartment() : "");
        map.put("bio", u.getBio() != null ? u.getBio() : "");
        map.put("role", u.getRole().name());
        map.put("createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : "");
        map.put("oauthProvider", u.getOauthProvider() != null ? u.getOauthProvider() : "");
        map.put("notifBookingUpdates", u.isNotifBookingUpdates());
        map.put("notifTicketUpdates", u.isNotifTicketUpdates());
        map.put("notifComments", u.isNotifComments());
        map.put("updatedAt", u.getUpdatedAt() != null ? u.getUpdatedAt().toString() : "");
        map.put("enabled", u.isEnabled());
        return map;
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
        if (stored == null || stored.isBlank()) return false;

        // BCrypt check - BCrypt hashes usually start with $2a$, $2b$ or $2y$
        if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
            return passwordEncoder.matches(rawPassword, stored);
        }

        // Plain text fallback (legacy)
        if (rawPassword.equals(stored)) {
            // Auto-upgrade this user account to BCrypt
            user.setPassword(passwordEncoder.encode(rawPassword));
            userRepository.save(user);
            return true;
        }
        return false;
    }
}



