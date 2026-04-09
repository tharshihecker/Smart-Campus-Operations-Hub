package com.sliit.smartcampus.booking.waitlist;

import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/waitlist")
public class WaitlistController {

    private final WaitlistService waitlistService;

    public WaitlistController(WaitlistService waitlistService) {
        this.waitlistService = waitlistService;
    }

    /** POST /api/waitlist – Join waitlist */
    @PostMapping
    public WaitlistResponse join(@RequestBody Map<String, Object> body) {
        return waitlistService.joinWaitlist(
                (String) body.get("facilityId"),
                (String) body.get("userId"),
                LocalDate.parse((String) body.get("bookingDate")),
                LocalTime.parse((String) body.get("startTime")),
                LocalTime.parse((String) body.get("endTime")),
                (String) body.get("purpose"),
                body.get("attendeeCount") != null ? Integer.valueOf(body.get("attendeeCount").toString()) : 1
        );
    }

    /** DELETE /api/waitlist/{id}?userId=xxx – Cancel waitlist entry */
    @DeleteMapping("/{id}")
    public Map<String, String> cancel(@PathVariable String id, @RequestParam String userId) {
        waitlistService.cancelWaitlist(id, userId);
        return Map.of("message", "Waitlist entry cancelled.");
    }

    /** GET /api/waitlist/user/{userId} – Get user's waitlist */
    @GetMapping("/user/{userId}")
    public List<WaitlistResponse> getUserWaitlist(@PathVariable String userId) {
        return waitlistService.getUserWaitlist(userId);
    }
}
