package com.sliit.smartcampus.service;

import com.sliit.smartcampus.model.Booking;
import com.sliit.smartcampus.model.CampusEvent;
import com.sliit.smartcampus.model.EventBooking;
import com.sliit.smartcampus.model.User;

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

    public void sendBookingConfirmation(User user, com.sliit.smartcampus.model.Booking booking) {
        sendBookingEmail(user, booking, "Your booking for '" + booking.getFacility().getName() + "' is confirmed",
                "<p>Hi " + (user.getFullName() == null ? user.getUsername() : user.getFullName()) + ",</p>" +
                "<p>Your booking for '<b>" + booking.getFacility().getName() + "</b>' is confirmed.</p>" +
                "<ul>" +
                "<li><b>Booking ID:</b> " + booking.getId() + "</li>" +
                "<li><b>Facility:</b> " + booking.getFacility().getName() + "</li>" +
                "<li><b>Booking Date:</b> " + booking.getBookingDate() + "</li>" +
                "<li><b>Time:</b> " + booking.getStartTime() + " - " + booking.getEndTime() + "</li>" +
                "</ul>" +
                "<p>Please present the QR code below at check-in.</p>" +
                "<div><img src=\"cid:bookingQr\" alt=\"QR code\"/></div>", true);
    }

    public boolean sendBookingEmail(User user, com.sliit.smartcampus.model.Booking booking, String subject, String body, boolean includeQr) {
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            log.warn("User or user email not present, skipping booking email");
            return false;
        }
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(user.getEmail());
            helper.setSubject(subject);
            helper.setText(body, true);
            if (includeQr && booking.getQrToken() != null && !booking.getQrToken().isBlank()) {
                byte[] qr = generateQrPngBytes(booking.getQrToken(), 300, 300);
                if (qr != null) helper.addInline("bookingQr", new ByteArrayResource(qr), "image/png");
            }
            mailSender.send(msg);
            log.info("Sent booking email to {}", user.getEmail());
            return true;
        } catch (Exception e) {
            log.error("Failed to send booking email", e);
            return false;
        }
    }

    public void sendPasswordResetOtp(User user, String otp) {
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            log.warn("User or email missing for OTP");
            return;
        }
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(user.getEmail());
            helper.setSubject("Password Reset OTP - Smart Campus");
            String html = "<div style='font-family:Arial,sans-serif;padding:20px;max-width:500px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;'>" +
                "<h2 style='color:#0f766e;'>Password Reset OTP</h2>" +
                "<p>We received a request to change your password. Use the following OTP to proceed:</p>" +
                "<div style='font-size:24px;font-weight:bold;letter-spacing:4px;padding:16px;background:#f3f4f6;text-align:center;border-radius:8px;margin:20px 0;'>" + otp + "</div>" +
                "<p>This OTP will expire in 10 minutes. If you did not request this, please ignore this email.</p>" +
                "</div>";
            helper.setText(html, true);
            mailSender.send(msg);
            log.info("Sent password reset OTP to {}", user.getEmail());
        } catch (Exception e) {
            log.error("Failed to send OTP email", e);
        }
    }

    public boolean sendTestEmail(String email) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject("SMTP Test - Smart Campus");
            helper.setText("<h1>SMTP Test</h1><p>The SMTP configuration is working correctly.</p>", true);
            mailSender.send(msg);
            log.info("Sent test email to {}", email);
            return true;
        } catch (Exception e) {
            log.error("SMTP test failed for {}", email, e);
            return false;
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



