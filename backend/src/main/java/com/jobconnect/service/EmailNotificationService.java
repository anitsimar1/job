package com.jobconnect.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class EmailNotificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailNotificationService.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final boolean mailEnabled;
    private final String fromAddress;
    private final String frontendUrl;

    public EmailNotificationService(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${app.mail.enabled:true}") boolean mailEnabled,
            @Value("${app.mail.from:no-reply@jobconnect.app}") String fromAddress,
            @Value("${app.frontend.url:http://localhost:5173}") String frontendUrl
    ) {
        this.mailSenderProvider = mailSenderProvider;
        this.mailEnabled = mailEnabled;
        this.fromAddress = fromAddress;
        this.frontendUrl = normalizeBaseUrl(frontendUrl);
    }

    public record ApplicationNotificationPayload(
            Long applicationId,
            String candidateName,
            String candidateEmail,
            String candidatePhone,
            Long jobId,
            String jobTitle,
            String company,
            String location,
            String salary,
            String posterName,
            String posterEmail,
            String resumeFileName,
            String experienceYears,
            String noticePeriod,
            String coverLetter
    ) {}

    @Async
    public void sendApplicationEmails(ApplicationNotificationPayload payload) {
        if (payload == null) {
            return;
        }
        sendCandidateConfirmation(payload);
        sendPosterNotification(payload);
    }

    public void sendCandidateConfirmation(ApplicationNotificationPayload payload) {
        if (!StringUtils.hasText(payload.candidateEmail())) {
            return;
        }
        String subject = "Application Confirmed: " + payload.jobTitle() + " at " + payload.company();
        String resumeLabel = StringUtils.hasText(payload.resumeFileName())
                ? payload.resumeFileName()
                : "Profile Application";

        StringBuilder body = new StringBuilder();
        body.append("Hi ").append(safeName(payload.candidateName(), "Candidate")).append(",\n\n");
        body.append("Your application for ").append(payload.jobTitle())
                .append(" at ").append(payload.company()).append(" has been submitted.\n\n");
        body.append("Application Summary:\n");
        body.append("- Reference ID: #").append(payload.applicationId()).append("\n");
        body.append("- Role: ").append(payload.jobTitle()).append("\n");
        body.append("- Company: ").append(payload.company()).append("\n");
        if (StringUtils.hasText(payload.location())) {
            body.append("- Location: ").append(payload.location()).append("\n");
        }
        if (StringUtils.hasText(payload.salary())) {
            body.append("- Compensation: ").append(payload.salary()).append("\n");
        }
        body.append("- Resume Used: ").append(resumeLabel).append("\n");
        body.append("- Status: APPLIED\n\n");
        body.append("Track your application status anytime on your Candidate Dashboard:\n");
        body.append(frontendUrl).append("/applications\n\n");
        body.append("Best regards,\nThe JobConnect Team");

        sendSafe(payload.candidateEmail(), subject, body.toString(), "candidate confirmation");
    }

    public void sendPosterNotification(ApplicationNotificationPayload payload) {
        if (!StringUtils.hasText(payload.posterEmail())) {
            return;
        }
        String subject = "New Candidate Application: "
                + safeName(payload.candidateName(), "A candidate")
                + " applied for " + payload.jobTitle();

        String resumeLabel = StringUtils.hasText(payload.resumeFileName())
                ? payload.resumeFileName()
                : "Profile Application (no file attached)";

        StringBuilder body = new StringBuilder();
        body.append("Hi ").append(safeName(payload.posterName(), "Hiring Team")).append(",\n\n");
        body.append("A candidate has just applied for your posted opening: ")
                .append(payload.jobTitle()).append(" at ").append(payload.company()).append(".\n\n");
        body.append("Candidate Details:\n");
        body.append("- Name: ").append(safeName(payload.candidateName(), "Candidate")).append("\n");
        body.append("- Email: ").append(payload.candidateEmail()).append("\n");
        if (StringUtils.hasText(payload.candidatePhone())) {
            body.append("- Phone: ").append(payload.candidatePhone()).append("\n");
        }
        if (StringUtils.hasText(payload.experienceYears())) {
            body.append("- Experience: ").append(payload.experienceYears()).append("\n");
        }
        if (StringUtils.hasText(payload.noticePeriod())) {
            body.append("- Notice Period: ").append(payload.noticePeriod()).append("\n");
        }
        body.append("- Resume: ").append(resumeLabel).append("\n");
        if (StringUtils.hasText(payload.coverLetter())) {
            String trimmedCover = payload.coverLetter().trim();
            if (trimmedCover.length() > 400) {
                trimmedCover = trimmedCover.substring(0, 400) + "...";
            }
            body.append("\nCandidate Note:\n").append(trimmedCover).append("\n");
        }
        body.append("\nReview this applicant and update their pipeline stage in your Job Poster Dashboard:\n");
        body.append(frontendUrl).append("/employer/dashboard\n\n");
        body.append("Best regards,\nThe JobConnect Team");

        sendSafe(payload.posterEmail(), subject, body.toString(), "job poster alert");
    }

    private void sendSafe(String to, String subject, String text, String label) {
        if (!mailEnabled) {
            log.info("Email delivery disabled (app.mail.enabled=false); skipped {} email to {}", label, to);
            return;
        }
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.info("SMTP mail sender not configured (MAIL_HOST unset); skipped {} email to {} [{}]", label, to, subject);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(to.trim());
            message.setSubject(subject);
            message.setText(text);
            mailSender.send(message);
            log.info("Sent {} email to {} (subject: {})", label, to, subject);
        } catch (Exception ex) {
            log.warn("Failed to send {} email to {}: {}", label, to, ex.getMessage());
        }
    }

    private static String safeName(String value, String fallback) {
        return StringUtils.hasText(value) ? value.trim() : fallback;
    }

    private static String normalizeBaseUrl(String url) {
        if (!StringUtils.hasText(url)) {
            return "http://localhost:5173";
        }
        String trimmed = url.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }
}
