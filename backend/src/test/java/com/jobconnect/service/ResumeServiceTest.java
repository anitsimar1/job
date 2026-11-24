package com.jobconnect.service;

import com.jobconnect.dto.ResumeDto;
import com.jobconnect.entity.Resume;
import com.jobconnect.entity.User;
import com.jobconnect.exception.BadRequestException;
import com.jobconnect.repository.ApplicationRepository;
import com.jobconnect.repository.ResumeRepository;
import com.jobconnect.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResumeServiceTest {

    @TempDir
    Path tempUploadDir;

    @Mock private ResumeRepository resumeRepository;
    @Mock private UserRepository userRepository;
    @Mock private ApplicationRepository applicationRepository;
    @Spy private DtoMapper dtoMapper = new DtoMapper();

    private ResumeService resumeService;
    private User seeker;

    @BeforeEach
    void setUp() {
        resumeService = new ResumeService(
                resumeRepository,
                userRepository,
                applicationRepository,
                dtoMapper,
                tempUploadDir.toString()
        );
        seeker = new User();
        seeker.setId(10L);
        seeker.setEmail("elena@techmail.io");
        seeker.setFullName("Elena Rostova");
    }

    @Test
    void uploadResume_acceptsValidPdfAndMarksFirstResumeAsDefault() {
        byte[] pdfBytes = "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF".getBytes(StandardCharsets.US_ASCII);
        MockMultipartFile file = new MockMultipartFile(
                "file", "Elena_Resume.pdf", "application/pdf", pdfBytes
        );

        when(userRepository.findByEmailIgnoreCase("elena@techmail.io")).thenReturn(Optional.of(seeker));
        when(resumeRepository.findByUserIdOrderByUploadedAtDesc(10L)).thenReturn(List.of());
        when(resumeRepository.save(any(Resume.class))).thenAnswer(inv -> {
            Resume r = inv.getArgument(0);
            r.setId(44L);
            return r;
        });

        ResumeDto dto = resumeService.uploadResume(file, "elena@techmail.io");

        assertThat(dto.id()).isEqualTo(44L);
        assertThat(dto.fileName()).isEqualTo("Elena_Resume.pdf");
        assertThat(dto.isDefault()).isTrue();
    }

    @Test
    void uploadResume_rejectsDisallowedExtensionOrSpoofedPdfBytes() {
        MockMultipartFile exeFile = new MockMultipartFile(
                "file", "malware.exe", "application/octet-stream", new byte[]{1, 2, 3, 4}
        );
        assertThatThrownBy(() -> resumeService.uploadResume(exeFile, "elena@techmail.io"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("PDF and DOCX");

        MockMultipartFile spoofedPdf = new MockMultipartFile(
                "file", "fake.pdf", "application/pdf", "NOTAPDF".getBytes(StandardCharsets.UTF_8)
        );
        assertThatThrownBy(() -> resumeService.uploadResume(spoofedPdf, "elena@techmail.io"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("PDF signature");
    }

    @Test
    void setDefaultResume_switchesDefaultFlagToSelectedResume() {
        Resume first = new Resume();
        first.setId(1L);
        first.setUser(seeker);
        first.setDefault(true);

        Resume second = new Resume();
        second.setId(2L);
        second.setUser(seeker);
        second.setDefault(false);

        when(userRepository.findByEmailIgnoreCase("elena@techmail.io")).thenReturn(Optional.of(seeker));
        when(resumeRepository.findByUserIdOrderByUploadedAtDesc(10L)).thenReturn(List.of(first, second));

        resumeService.setDefaultResume(2L, "elena@techmail.io");

        assertThat(first.isDefault()).isFalse();
        assertThat(second.isDefault()).isTrue();
        verify(resumeRepository).saveAll(List.of(first, second));
    }

    @Test
    void deleteResume_blocksDeletingAnotherUsersResume() {
        User otherUser = new User();
        otherUser.setId(99L);
        otherUser.setEmail("other@techmail.io");

        Resume resume = new Resume();
        resume.setId(5L);
        resume.setUser(otherUser);
        resume.setFilePath(tempUploadDir.resolve("other.pdf").toString());

        when(userRepository.findByEmailIgnoreCase("elena@techmail.io")).thenReturn(Optional.of(seeker));
        when(resumeRepository.findById(5L)).thenReturn(Optional.of(resume));

        assertThatThrownBy(() -> resumeService.deleteResume(5L, "elena@techmail.io"))
                .isInstanceOf(AccessDeniedException.class);
        verify(resumeRepository, never()).delete(any());
    }

    @Test
    void downloadResume_allowsPosterOfAppliedJobAndBlocksUnrelatedPoster() throws Exception {
        Path resumeFile = tempUploadDir.resolve("applicant.pdf");
        java.nio.file.Files.write(resumeFile, "%PDF-1.4\n%%EOF".getBytes(StandardCharsets.US_ASCII));

        Resume resume = new Resume();
        resume.setId(77L);
        resume.setUser(seeker);
        resume.setFileName("applicant.pdf");
        resume.setContentType("application/pdf");
        resume.setFilePath(resumeFile.toString());

        when(resumeRepository.findById(77L)).thenReturn(Optional.of(resume));
        when(applicationRepository.existsByResumeIdAndJobCreatedByEmailIgnoreCase(77L, "poster@acme.io"))
                .thenReturn(true);
        when(applicationRepository.existsByResumeIdAndJobCreatedByEmailIgnoreCase(77L, "other-poster@acme.io"))
                .thenReturn(false);

        ResumeService.DownloadedResume downloaded = resumeService.downloadResume(77L, "poster@acme.io", false);
        assertThat(downloaded.fileName()).isEqualTo("applicant.pdf");

        assertThatThrownBy(() -> resumeService.downloadResume(77L, "other-poster@acme.io", false))
                .isInstanceOf(AccessDeniedException.class);
    }
}
