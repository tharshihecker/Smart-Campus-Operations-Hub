package com.sliit.smartcampus.email;

import com.sliit.smartcampus.booking.Booking;
import com.sliit.smartcampus.booking.QrCodeUtil;
import com.sliit.smartcampus.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.google.zxing.WriterException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.io.IOException;
import java.time.LocalDateTime;

@Service("smtpEmailService")
public class EmailService {
    private static final Logger LOGGER = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String smtpUsername;

    public EmailService(JavaMailSender mailSender,
                        @Value("${app.email.from:no-reply@smartcampus.local}") String fromAddress,
                        @Value("${spring.mail.username:}") String smtpUsername) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.smtpUsername = smtpUsername;
    }

    public boolean sendBookingEmail(User user, Booking booking, String subject, String htmlBody, boolean includeQr) {
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            LOGGER.debug("Skipping booking email because user email is missing");
            return false;
        }

        if (smtpUsername == null || smtpUsername.isBlank()) {
            LOGGER.info("[SIMULATED EMAIL] To: '{}', Subject: '{}'", user.getEmail(), subject);
            return true;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, includeQr, "UTF-8");
            helper.setTo(user.getEmail());
            helper.setFrom(fromAddress);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            if (includeQr) {
                byte[] qrBytes = QrCodeUtil.generateQrPng(QrCodeUtil.buildBookingQrContent(booking), 300);
                helper.addInline("bookingQr", new ByteArrayResource(qrBytes), "image/png");
                
                byte[] icsBytes = com.sliit.smartcampus.booking.IcsGenerator.generateIcs(booking, fromAddress);
                helper.addAttachment("booking.ics", new ByteArrayResource(icsBytes), "text/calendar");
            }

            mailSender.send(message);
            LOGGER.info("Sent booking email to {} for booking {}", user.getEmail(), booking.getId());
            return true;
        } catch (MessagingException | IOException | WriterException | RuntimeException ex) {
            LOGGER.warn("Failed to send booking email to {}: {}", user.getEmail(), ex.getMessage());
            return false;
        }
    }

    public boolean sendTestEmail(String toEmail) {
        if (toEmail == null || toEmail.isBlank()) {
            return false;
        }
        if (smtpUsername == null || smtpUsername.isBlank()) {
            LOGGER.info("[SIMULATED TEST EMAIL] To: '{}'", toEmail);
            return true;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setTo(toEmail);
            helper.setFrom(fromAddress);
            helper.setSubject("Smart Campus SMTP Test");
            helper.setText(
                    "<p>This is a test email from Smart Campus.</p>"
                            + "<p><strong>Sent at:</strong> " + LocalDateTime.now() + "</p>"
                            + "<p>If you received this email, SMTP is configured correctly.</p>",
                    true
            );
            mailSender.send(message);
            LOGGER.info("Sent SMTP test email to {}", toEmail);
            return true;
        } catch (MessagingException | RuntimeException ex) {
            LOGGER.warn("Failed to send SMTP test email to {}: {}", toEmail, ex.getMessage());
            return false;
        }
    }
}
