package com.sliit.smartcampus.notification;

import com.sliit.smartcampus.event.CampusEvent;
import com.sliit.smartcampus.event.EventBooking;
import com.sliit.smartcampus.user.User;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:vkaura1010@gmail.com}")
    private String fromEmail;

    @Autowired
    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendBookingConfirmation(User user, EventBooking booking, CampusEvent event) {
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            log.warn("User or user email not present, skipping booking confirmation email");
            return;
        }
        if (booking.getQrToken() == null || booking.getQrToken().isBlank()) {
            log.warn("No QR token on booking {}, skipping email", booking.getId());
            return;
        }

        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(user.getEmail());
            helper.setSubject("Event Booking Confirmed: " + event.getTitle());

            String name = user.getFullName() != null ? user.getFullName() : user.getUsername();
            String seat = booking.getSeatNumber() != null ? String.valueOf(booking.getSeatNumber()) : "N/A";
            String time = (event.getStartTime() != null ? event.getStartTime() : "") +
                          (event.getEndTime() != null ? " - " + event.getEndTime() : "");
            String qrUrl = "http://localhost:3000/admin/event-checkin?qr=" + booking.getQrToken();

            String html = "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden'>" +
                "<div style='background:linear-gradient(135deg,#0f766e,#0369a1);padding:28px 32px'>" +
                "<h1 style='color:#fff;margin:0;font-size:1.5rem'>✅ Booking Confirmed</h1>" +
                "<p style='color:#e0f2fe;margin:6px 0 0'>Smart Campus - NUSLIIT</p>" +
                "</div>" +
                "<div style='padding:28px 32px;background:#fff'>" +
                "<p style='color:#374151;font-size:1rem'>Hi <strong>" + name + "</strong>,</p>" +
                "<p style='color:#374151'>Your booking for <strong>" + event.getTitle() + "</strong> has been confirmed. Please find your details below.</p>" +
                "<div style='background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:20px 0'>" +
                "<h3 style='margin:0 0 14px;color:#111827'>🎉 Event Details</h3>" +
                "<table style='width:100%;border-collapse:collapse'>" +
                row("Event", event.getTitle()) +
                row("Date", event.getEventDate() != null ? event.getEventDate() : "N/A") +
                row("Time", !time.isBlank() ? time : "N/A") +
                row("Location", event.getLocation() != null ? event.getLocation() : "N/A") +
                row("Booking ID", booking.getBookingNumber()) +
                row("Seat", seat) +
                "</table></div>" +
                "<p style='color:#374151;margin:20px 0 8px'><strong>📱 Your Check-In QR Code</strong></p>" +
                "<p style='color:#6b7280;font-size:0.9rem'>Show this QR code at the event entrance. Admin will scan it to confirm your entry.</p>" +
                "<div style='text-align:center;margin:20px 0'>" +
                "<img src='cid:qrimg' alt='QR Code' style='width:220px;height:220px;border:1px solid #e5e7eb;border-radius:8px;padding:8px'/>" +
                "</div>" +
                "<p style='color:#9ca3af;font-size:0.8rem;text-align:center'>This QR code is single-use. Do not share it.</p>" +
                "</div>" +
                "<div style='background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center'>" +
                "<p style='color:#9ca3af;font-size:0.8rem;margin:0'>Smart Campus Platform &mdash; NUSLIIT</p>" +
                "</div></div>";

            helper.setText(html, true);

            byte[] qr = generateQrPngBytes(qrUrl, 300, 300);
            if (qr != null) {
                helper.addInline("qrimg", new ByteArrayResource(qr), "image/png");
            }

            mailSender.send(msg);
            log.info("Sent event booking confirmation email to {}", user.getEmail());
        } catch (MessagingException e) {
            log.error("Failed to send event booking confirmation email", e);
        }
    }

    public void sendBookingConfirmation(User user, com.sliit.smartcampus.booking.Booking booking) {
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            log.warn("User or user email not present, skipping facility booking confirmation email");
            return;
        }

        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(user.getEmail());
            helper.setSubject("Your booking for '" + booking.getFacility().getName() + "' is confirmed");

            StringBuilder html = new StringBuilder();
            html.append("<p>Hi ").append(user.getFullName() == null ? user.getUsername() : user.getFullName()).append(",</p>");
            html.append("<p>Your booking for '<b>").append(booking.getFacility().getName()).append("</b>' is confirmed.</p>");
            html.append("<ul>");
            html.append("<li><b>Booking ID:</b> ").append(booking.getId()).append("</li>");
            html.append("<li><b>Facility:</b> ").append(booking.getFacility().getName()).append("</li>");
            html.append("<li><b>Booking Date:</b> ").append(booking.getBookingDate()).append("</li>");
            html.append("<li><b>Time:</b> ").append(booking.getStartTime()).append(" - ").append(booking.getEndTime()).append("</li>");
            html.append("<li><b>Purpose:</b> ").append(booking.getPurpose() == null ? "-" : booking.getPurpose()).append("</li>");
            html.append("<li><b>Attendee Count:</b> ").append(booking.getAttendeeCount() == null ? "1" : booking.getAttendeeCount()).append("</li>");
            html.append("</ul>");
            html.append("<p>Please present the QR code below at check-in.</p>");
            html.append("<div><img src=\"cid:qrimg\" alt=\"QR code\"/></div>");
            helper.setText(html.toString(), true);

            if (booking.getQrToken() != null && !booking.getQrToken().isBlank()) {
                byte[] qr = generateQrPngBytes(booking.getQrToken(), 300, 300);
                if (qr != null) helper.addInline("qrimg", new ByteArrayResource(qr), "image/png");
            }

            mailSender.send(msg);
            log.info("Sent facility booking confirmation email to {}", user.getEmail());
        } catch (MessagingException e) {
            log.error("Failed to construct/send facility booking confirmation email", e);
        }
    }

    private String row(String label, String value) {
        return "<tr>" +
               "<td style='padding:8px 0;color:#6b7280;font-size:0.9rem;width:120px'><strong>" + label + "</strong></td>" +
               "<td style='padding:8px 0;color:#111827;font-size:0.9rem'>" + value + "</td>" +
               "</tr>";
    }

    private byte[] generateQrPngBytes(String text, int width, int height) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            QRCodeWriter qrWriter = new QRCodeWriter();
            BitMatrix matrix = qrWriter.encode(text, BarcodeFormat.QR_CODE, width, height);
            MatrixToImageWriter.writeToStream(matrix, "PNG", baos);
            return baos.toByteArray();
        } catch (WriterException | IOException e) {
            log.error("Failed to generate QR code", e);
            return null;
        }
    }
}
