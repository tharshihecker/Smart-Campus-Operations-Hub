package com.sliit.smartcampus.user;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sliit.smartcampus.security.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * REST controller for Google OAuth 2.0 authentication.
 * Endpoint: POST /api/auth/google
 *
 * Accepts a Google access token from the React frontend (via @react-oauth/google),
 * exchanges it for user info from Google's userinfo endpoint, then creates or 
 * retrieves the user and issues a JWT token using our existing JwtUtil.
 */
@RestController
@RequestMapping("/api/auth")
public class OAuthController {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.google.client-id:YOUR_GOOGLE_CLIENT_ID}")
    private String googleClientId;

    public OAuthController(UserRepository userRepository, JwtUtil jwtUtil, RestTemplate restTemplate, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.restTemplate = restTemplate;
        this.passwordEncoder = passwordEncoder;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Exchange a Google access token for user info and issue JWT for our application.
     * Body: { "accessToken": "<google_access_token>" }
     */
    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> body) {
        String accessToken = body.get("accessToken");
        // Support legacy "idToken" field name for backwards compatibility
        if ((accessToken == null || accessToken.isBlank()) && body.containsKey("idToken")) {
            accessToken = body.get("idToken");
        }
        
        if (accessToken == null || accessToken.isBlank()) {
            return ResponseEntity.badRequest().body("Missing accessToken");
        }

        try {
            // Fetch user info from Google using the access token
            GoogleUserInfo userInfo = fetchGoogleUserInfo(accessToken);
            if (userInfo == null || userInfo.email == null) {
                return ResponseEntity.status(401).body("Could not retrieve email from Google");
            }

            String email = userInfo.email;
            String googleId = userInfo.id;
            String fullName = userInfo.name;
            String pictureUrl = userInfo.picture;

            // Find existing user by email or Google ID
            User user = userRepository.findByEmailIgnoreCase(email)
                    .orElseGet(() -> {
                        // Auto-create new user from Google account
                        User newUser = new User();
                        newUser.setEmail(email);
                        // Generate safe username from email prefix
                        String baseUsername = email.split("@")[0].replaceAll("[^a-zA-Z0-9_]", "");
                        String username = ensureUniqueUsername(baseUsername);
                        newUser.setUsername(username);
                        newUser.setFullName(fullName != null ? fullName : baseUsername);
                        newUser.setGoogleId(googleId);
                        newUser.setOauthProvider("GOOGLE");
                        newUser.setRole(UserRole.USER);
                        newUser.setEnabled(true);
                        // Set a placeholder password for OAuth-only accounts (will never be used for login)
                        String oauthPlaceholder = "OAUTH_" + UUID.randomUUID().toString();
                        newUser.setPassword(passwordEncoder.encode(oauthPlaceholder));
                        return userRepository.save(newUser);
                    });

            // If existing user doesn't have Google ID linked yet, link it
            if (user.getGoogleId() == null || user.getGoogleId().isBlank()) {
                user.setGoogleId(googleId);
                user.setOauthProvider("GOOGLE");
                userRepository.save(user);
            }

            if (!user.isEnabled()) {
                return ResponseEntity.status(403).body("Account is disabled. Please contact admin.");
            }

            String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name(), user.getId());

            return ResponseEntity.ok(Map.of(
                    "token", token,
                    "userId", Objects.requireNonNull(user.getId()),
                    "username", user.getUsername(),
                    "email", user.getEmail(),
                    "role", user.getRole().name(),
                    "fullName", user.getFullName() != null ? user.getFullName() : "",
                    "department", user.getDepartment() != null ? user.getDepartment() : "",
                    "oauthProvider", "GOOGLE"
            ));

        } catch (Exception e) {
            return ResponseEntity.status(500).body("OAuth login failed: " + e.getMessage());
        }
    }

    /**
     * Fetch Google user information using the access token.
     * Calls Google's userinfo endpoint.
     */
    private GoogleUserInfo fetchGoogleUserInfo(String accessToken) throws Exception {
        String url = "https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + accessToken;
        
        try {
            String response = restTemplate.getForObject(url, String.class);
            if (response == null) {
                return null;
            }
            
            JsonNode jsonNode = objectMapper.readTree(response);
            GoogleUserInfo userInfo = new GoogleUserInfo();
            userInfo.id = jsonNode.get("id") != null ? jsonNode.get("id").asText() : null;
            userInfo.email = jsonNode.get("email") != null ? jsonNode.get("email").asText() : null;
            userInfo.name = jsonNode.get("name") != null ? jsonNode.get("name").asText() : null;
            userInfo.picture = jsonNode.get("picture") != null ? jsonNode.get("picture").asText() : null;
            
            return userInfo;
        } catch (Exception e) {
            // Token is invalid or expired
            return null;
        }
    }

    private String ensureUniqueUsername(String base) {
        String candidate = base;
        int suffix = 1;
        while (userRepository.findByUsernameIgnoreCase(candidate).isPresent()) {
            candidate = base + suffix++;
        }
        return candidate;
    }

    /**
     * Simple data object for Google user info from the userinfo endpoint.
     */
    private static class GoogleUserInfo {
        String id;
        String email;
        String name;
        String picture;
    }
}
