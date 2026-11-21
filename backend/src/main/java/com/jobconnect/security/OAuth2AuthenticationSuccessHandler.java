package com.jobconnect.security;

import com.jobconnect.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private static final Logger log = LoggerFactory.getLogger(OAuth2AuthenticationSuccessHandler.class);

    private final AuthService authService;
    private final HttpCookieOAuth2AuthorizationRequestRepository authorizationRequestRepository;

    @Value("${app.oauth2.frontend-redirect-uri:http://localhost:5173/oauth/callback}")
    private String frontendRedirectUri;

    public OAuth2AuthenticationSuccessHandler(
            AuthService authService,
            HttpCookieOAuth2AuthorizationRequestRepository authorizationRequestRepository
    ) {
        this.authService = authService;
        this.authorizationRequestRepository = authorizationRequestRepository;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException {
        authorizationRequestRepository.removeAuthorizationRequestCookies(request, response);

        if (!(authentication.getPrincipal() instanceof OAuth2User oauth2User)) {
            redirectWithError(request, response, "Unable to read Google profile information.");
            return;
        }

        try {
            String sub = stringAttr(oauth2User, "sub");
            String email = stringAttr(oauth2User, "email");
            String name = stringAttr(oauth2User, "name");
            String picture = stringAttr(oauth2User, "picture");
            boolean emailVerified = parseEmailVerified(oauth2User.getAttribute("email_verified"));

            AuthService.AuthResult result = authService.processGoogleOAuthLogin(
                    sub, email, emailVerified, name, picture
            );

            response.addHeader(HttpHeaders.SET_COOKIE, result.cookie().toString());
            String targetUrl = UriComponentsBuilder.fromUriString(normalizeRedirectBase(frontendRedirectUri))
                    .queryParam("oauth", "success")
                    .build()
                    .toUriString();

            getRedirectStrategy().sendRedirect(request, response, targetUrl);
        } catch (Exception ex) {
            log.warn("Google OAuth2 login processing failed: {}", ex.getMessage());
            redirectWithError(request, response, ex.getMessage());
        }
    }

    private void redirectWithError(
            HttpServletRequest request,
            HttpServletResponse response,
            String message
    ) throws IOException {
        String safeMessage = (message == null || message.isBlank())
                ? "Google authentication failed. Please try again."
                : message;
        String targetUrl = UriComponentsBuilder.fromUriString(normalizeRedirectBase(frontendRedirectUri))
                .queryParam("oauth_error", safeMessage)
                .build()
                .toUriString();
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }

    private String normalizeRedirectBase(String uri) {
        if (uri == null) return "http://localhost:5173/oauth/callback";
        String trimmed = uri.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    private String stringAttr(OAuth2User user, String key) {
        Object val = user.getAttribute(key);
        return val != null ? String.valueOf(val) : null;
    }

    private boolean parseEmailVerified(Object attr) {
        if (attr instanceof Boolean b) {
            return b;
        }
        if (attr instanceof String s) {
            return Boolean.parseBoolean(s);
        }
        return false;
    }
}
