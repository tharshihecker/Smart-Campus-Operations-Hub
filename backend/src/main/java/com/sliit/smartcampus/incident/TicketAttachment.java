package com.sliit.smartcampus.incident;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "ticket_attachments")
public class TicketAttachment {

    @Id
    private String id;

    @DBRef
    private IncidentTicket ticket;

    private String fileName;

    private String filePath;

    private String contentType;

    private Long fileSize;

    // INNOVATION: Photo annotations (JSON string storing drawing data)
    private String annotationData; // JSON with drawing objects, text labels, circles, rectangles, etc.

    // Getters and Setters
    public String getId() { return id; }
    public IncidentTicket getTicket() { return ticket; }
    public void setTicket(IncidentTicket ticket) { this.ticket = ticket; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
    public String getAnnotationData() { return annotationData; }
    public void setAnnotationData(String annotationData) { this.annotationData = annotationData; }
}
