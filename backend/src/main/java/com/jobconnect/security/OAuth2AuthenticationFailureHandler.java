package com.jobconnect.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
public class OAuth2AuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    private static final Logger log = LoggerFactory.getLogger(OAuth2AuthenticationFailureHandler.class);

    private final HttpCookieOAuth2AuthorizationRequestRepository authorizationRequestRepository;

    @Value("${app.oauth2.frontend-redirect-uri:http://localhost:5173/oauth/callback}")
    private String frontendRedirectUri;

    public OAuth2AuthenticationFailureHandler(
            HttpCookieOAuth2AuthorizationRequestRepository authorizationRequestRepository
    ) {
        this.authorizationRequestRepository = authorizationRequestRepository;
    }

    @Override
    public void onAuthenticationFailure(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception
    ) throws IOException {
        authorizationRequestRepository.removeAuthorizationRequestCookies(request, response);

        String message = "Google sign-in failed. Please try again.";
        if (exception instanceof OAuth2AuthenticationException oauthEx
                && oauthEx.getError() != null
                && "access_denied".equalsIgnoreCase(oauthEx.getError().getErrorCode())) {
            message = "Google sign-in was cancelled.";
        } else if (exception.getMessage() != null && !exception.getMessage().isBlank()) {
            log.warn("OAuth2 authentication failure: {}", exception.getMessage());
        }

        String targetUrl = UriComponentsBuilder.fromUriString(normalizeRedirectBase(frontendRedirectUri))
                .queryParam("oauth_error", message)
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
}
