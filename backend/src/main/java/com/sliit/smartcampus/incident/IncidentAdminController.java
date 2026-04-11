package com.sliit.smartcampus.incident;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/incidents")
public class IncidentAdminController {

    private final IncidentTicketService incidentTicketService;

    public IncidentAdminController(IncidentTicketService incidentTicketService) {
        this.incidentTicketService = incidentTicketService;
    }

    /** GET /api/admin/incidents – All tickets with optional filters */
    @GetMapping
    public ResponseEntity<List<IncidentTicketResponse>> getAllTickets(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok()
                .header("Cache-Control", "no-cache, no-store, must-revalidate") // Real-time polling every 15s
                .body(incidentTicketService.getAllTickets(status, priority, category));
    }

    /** GET /api/admin/incidents/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<IncidentTicketResponse> getTicket(@PathVariable String id) {
        return ResponseEntity.ok()
                .header("Cache-Control", "no-cache, no-store, must-revalidate") // Real-time polling
                .body(incidentTicketService.getTicketById(id));
    }

    /** PUT /api/admin/incidents/{id}/status – Update ticket status */
    @PutMapping("/{id}/status")
    public ResponseEntity<IncidentTicketResponse> updateStatus(@PathVariable String id,
                                                               @RequestBody Map<String, String> body) {
        TicketStatus status = TicketStatus.valueOf(body.get("status"));
        String notes = body.get("resolutionNotes");
        String reason = body.get("rejectionReason");
        return ResponseEntity.ok(incidentTicketService.updateStatus(id, status, notes, reason));
    }

    /** PUT /api/admin/incidents/{id}/assign – Assign technician */
    @PutMapping("/{id}/assign")
    public ResponseEntity<IncidentTicketResponse> assignTechnician(@PathVariable String id,
                                                                    @RequestBody Map<String, String> body) {
        String techId = body.get("technicianId");
        return ResponseEntity.ok(incidentTicketService.assignTechnician(id, techId));
    }

    /** POST /api/admin/incidents/{id}/comments – Admin add comment */
    @PostMapping("/{id}/comments")
    public ResponseEntity<TicketCommentResponse> addComment(@PathVariable String id,
                                                            @RequestBody Map<String, String> body,
                                                            @RequestParam String adminId) {
        return ResponseEntity.status(201).body(
                incidentTicketService.addComment(id, body.get("content"), adminId));
    }

    /** DELETE /api/admin/incidents/comments/{commentId} */
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable String commentId,
                                              @RequestParam String adminId) {
        incidentTicketService.deleteComment(commentId, adminId, true);
        return ResponseEntity.noContent().build();
    }

    /** GET /api/admin/incidents/statuses */
    @GetMapping("/statuses")
    public ResponseEntity<TicketStatus[]> getStatuses() {
        return ResponseEntity.ok()
                .header("Cache-Control", "public, max-age=3600") // Cache for 1 hour, static data
                .body(TicketStatus.values());
    }

    /** GET /api/admin/incidents/priorities */
    @GetMapping("/priorities")
    public ResponseEntity<TicketPriority[]> getPriorities() {
        return ResponseEntity.ok()
                .header("Cache-Control", "public, max-age=3600") // Cache for 1 hour, static data
                .body(TicketPriority.values());
    }
}
