package com.sliit.smartcampus.incident;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/incidents")
public class IncidentTicketController {

    private final IncidentTicketService incidentTicketService;

    public IncidentTicketController(IncidentTicketService incidentTicketService) {
        this.incidentTicketService = incidentTicketService;
    }

    private String getCurrentUserId(Principal principal) {
        return (String) ((UsernamePasswordAuthenticationToken) principal).getCredentials();
    }

    /** POST /api/incidents – Create new ticket (multipart for file upload support) */
    @PostMapping(consumes = {MediaType.MULTIPART_FORM_DATA_VALUE, MediaType.APPLICATION_JSON_VALUE})
    public ResponseEntity<IncidentTicketResponse> createTicket(
            @RequestPart("title") String title,
            @RequestPart("description") String description,
            @RequestPart("category") String category,
            @RequestPart(value = "priority", required = false) String priority,
            @RequestPart("location") String location,
            @RequestPart(value = "contactDetails", required = false) String contactDetails,
            @RequestPart(value = "files", required = false) List<MultipartFile> files,
            Principal principal) {

        String userId = getCurrentUserId(principal);
        IncidentTicketRequest req = new IncidentTicketRequest();
        req.setTitle(title);
        req.setDescription(description);
        req.setCategory(category);
        req.setPriority(priority != null ? TicketPriority.valueOf(priority.toUpperCase()) : TicketPriority.MEDIUM);
        req.setLocation(location);
        req.setContactDetails(contactDetails);

        return ResponseEntity.status(201).body(incidentTicketService.createTicket(req, userId, files));
    }

    /** GET /api/incidents – My tickets */
    @GetMapping
    public ResponseEntity<List<IncidentTicketResponse>> getMyTickets(Principal principal) {
        String userId = getCurrentUserId(principal);
        return ResponseEntity.ok(incidentTicketService.getMyTickets(userId));
    }

    /** GET /api/incidents/assigned – Technician's assigned tickets */
    @GetMapping("/assigned")
    public ResponseEntity<List<IncidentTicketResponse>> getAssignedTickets(Principal principal) {
        String userId = getCurrentUserId(principal);
        return ResponseEntity.ok(incidentTicketService.getAssignedTickets(userId));
    }

    /** GET /api/incidents/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<IncidentTicketResponse> getTicket(@PathVariable String id) {
        return ResponseEntity.ok(incidentTicketService.getTicketById(id));
    }

    /** GET /api/incidents/{id}/comments */
    @GetMapping("/{id}/comments")
    public ResponseEntity<List<TicketCommentResponse>> getComments(@PathVariable String id) {
        return ResponseEntity.ok(incidentTicketService.getComments(id));
    }

    /** POST /api/incidents/{id}/comments */
    @PostMapping("/{id}/comments")
    public ResponseEntity<TicketCommentResponse> addComment(@PathVariable String id,
                                                            @RequestBody Map<String, String> body,
                                                            Principal principal) {
        String userId = getCurrentUserId(principal);
        String content = body.get("content");
        if (content == null || content.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.status(201).body(incidentTicketService.addComment(id, content, userId));
    }

    /** PUT /api/incidents/comments/{commentId} */
    @PutMapping("/comments/{commentId}")
    public ResponseEntity<TicketCommentResponse> editComment(@PathVariable String commentId,
                                                             @RequestBody Map<String, String> body,
                                                             Principal principal) {
        String userId = getCurrentUserId(principal);
        return ResponseEntity.ok(incidentTicketService.editComment(commentId, body.get("content"), userId));
    }

    /** DELETE /api/incidents/comments/{commentId} */
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable String commentId, Principal principal) {
        String userId = getCurrentUserId(principal);
        incidentTicketService.deleteComment(commentId, userId, false);
        return ResponseEntity.noContent().build();
    }

    /** DELETE /api/incidents/{id} — user can only delete their own OPEN, CLOSED, or REJECTED tickets */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTicket(@PathVariable String id, Principal principal) {
        String userId = getCurrentUserId(principal);
        incidentTicketService.deleteTicket(id, userId);
        return ResponseEntity.noContent().build();
    }
}
