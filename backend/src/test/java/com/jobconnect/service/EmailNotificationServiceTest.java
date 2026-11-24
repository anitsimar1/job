package com.jobconnect.service;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class EmailNotificationServiceTest {

    @Test
    @SuppressWarnings("unchecked")
    void sendApplicationEmails_sendsConfirmationToCandidateAndAlertToJobPoster() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(mailSender);

        EmailNotificationService service = new EmailNotificationService(
                provider, true, "no-reply@jobconnect.app", "https://jobconnect.vercel.app"
        );

        EmailNotificationService.ApplicationNotificationPayload payload =
                new EmailNotificationService.ApplicationNotificationPayload(
                        99L,
                        "Elena Rostova",
                        "elena@techmail.io",
                        "+1 555 234 8901",
                        55L,
                        "Staff Frontend Architect",
                        "Apex Cloud Systems",
                        "Remote",
                        "$180k - $210k",
                        "Marcus Vance",
                        "poster@apexcloud.io",
                        "Elena_Resume.pdf",
                        "7+ yrs",
                        "2 Weeks",
                        "Excited to help scale the design system."
                );

        service.sendApplicationEmails(payload);

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, times(2)).send(captor.capture());

        List<SimpleMailMessage> sent = captor.getAllValues();
        SimpleMailMessage candidateEmail = sent.get(0);
        SimpleMailMessage posterEmail = sent.get(1);

        assertThat(candidateEmail.getTo()).containsExactly("elena@techmail.io");
        assertThat(candidateEmail.getSubject()).contains("Application Confirmed").contains("Staff Frontend Architect");
        assertThat(candidateEmail.getText()).contains("Elena Rostova").contains("Apex Cloud Systems").contains("Elena_Resume.pdf");

        assertThat(posterEmail.getTo()).containsExactly("poster@apexcloud.io");
        assertThat(posterEmail.getSubject()).contains("New Candidate Application").contains("Elena Rostova");
        assertThat(posterEmail.getText()).contains("Marcus Vance").contains("elena@techmail.io").contains("https://jobconnect.vercel.app/employer/dashboard");
    }

    @Test
    @SuppressWarnings("unchecked")
    void sendApplicationEmails_continuesWhenOneMailFailsOrPosterEmailMissing() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(mailSender);
        doThrow(new MailSendException("SMTP unavailable")).when(mailSender).send(any(SimpleMailMessage.class));

        EmailNotificationService service = new EmailNotificationService(
                provider, true, "no-reply@jobconnect.app", "http://localhost:5173"
        );

        EmailNotificationService.ApplicationNotificationPayload payload =
                new EmailNotificationService.ApplicationNotificationPayload(
                        10L, "Candidate", "cand@test.io", null, 1L,
                        "Backend Engineer", "Stripe", "Remote", "$170k",
                        null, null, null, null, null, null
                );

        // Must not throw even when SMTP fails, and skips poster email when posterEmail is null
        service.sendApplicationEmails(payload);

        verify(mailSender, times(1)).send(any(SimpleMailMessage.class));
    }
}
