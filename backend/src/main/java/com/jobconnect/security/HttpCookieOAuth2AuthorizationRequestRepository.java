package com.jobconnect.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.Set;

/**
 * Cookie-backed AuthorizationRequestRepository so OAuth2 authorization code flow
 * works cleanly with SessionCreationPolicy.STATELESS without requiring HTTP sessions.
 */
@Component
public class HttpCookieOAuth2AuthorizationRequestRepository
        implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

    private static final Logger log = LoggerFactory.getLogger(HttpCookieOAuth2AuthorizationRequestRepository.class);
    public static final String OAUTH2_AUTHORIZATION_REQUEST_COOKIE_NAME = "jobconnect_oauth2_auth_req";
    private static final int COOKIE_EXPIRE_SECONDS = 180;

    private final ObjectMapper objectMapper;
    private final JwtProperties jwtProperties;

    public HttpCookieOAuth2AuthorizationRequestRepository(
            ObjectMapper objectMapper,
            JwtProperties jwtProperties
    ) {
        this.objectMapper = objectMapper;
        this.jwtProperties = jwtProperties;
    }

    public record SerializableOAuth2Request(
            String authorizationUri,
            String clientId,
            String redirectUri,
            Set<String> scopes,
            String state,
            Map<String, Object> additionalParameters,
            String authorizationRequestUri,
            Map<String, Object> attributes
    ) {}

    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
        Cookie cookie = findCookie(request, OAUTH2_AUTHORIZATION_REQUEST_COOKIE_NAME);
        if (cookie == null || !StringUtils.hasText(cookie.getValue())) {
            return null;
        }
        return deserialize(cookie.getValue());
    }

    @Override
    public void saveAuthorizationRequest(
            OAuth2AuthorizationRequest authorizationRequest,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        if (authorizationRequest == null) {
            removeAuthorizationRequestCookies(request, response);
            return;
        }

        String serialized = serialize(authorizationRequest);
        if (serialized == null) {
            return;
        }

        ResponseCookie cookie = ResponseCookie.from(OAUTH2_AUTHORIZATION_REQUEST_COOKIE_NAME, serialized)
                .httpOnly(true)
                .secure(jwtProperties.isCookieSecure() || request.isSecure())
                .path("/")
                .sameSite("Lax")
                .maxAge(COOKIE_EXPIRE_SECONDS)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    @Override
    public OAuth2AuthorizationRequest removeAuthorizationRequest(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        OAuth2AuthorizationRequest loaded = loadAuthorizationRequest(request);
        removeAuthorizationRequestCookies(request, response);
        return loaded;
    }

    public void removeAuthorizationRequestCookies(HttpServletRequest request, HttpServletResponse response) {
        ResponseCookie cleared = ResponseCookie.from(OAUTH2_AUTHORIZATION_REQUEST_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(jwtProperties.isCookieSecure() || request.isSecure())
                .path("/")
                .sameSite("Lax")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cleared.toString());
    }

    private Cookie findCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                return cookie;
            }
        }
        return null;
    }

    private String serialize(OAuth2AuthorizationRequest req) {
        try {
            SerializableOAuth2Request payload = new SerializableOAuth2Request(
                    req.getAuthorizationUri(),
                    req.getClientId(),
                    req.getRedirectUri(),
                    req.getScopes(),
                    req.getState(),
                    req.getAdditionalParameters(),
                    req.getAuthorizationRequestUri(),
                    req.getAttributes()
            );
            byte[] json = objectMapper.writeValueAsBytes(payload);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(json);
        } catch (Exception ex) {
            log.warn("Failed to serialize OAuth2 authorization request", ex);
            return null;
        }
    }

    private OAuth2AuthorizationRequest deserialize(String value) {
        try {
            byte[] json = Base64.getUrlDecoder().decode(value.getBytes(StandardCharsets.UTF_8));
            SerializableOAuth2Request data = objectMapper.readValue(json, SerializableOAuth2Request.class);
            OAuth2AuthorizationRequest.Builder builder = OAuth2AuthorizationRequest.authorizationCode()
                    .authorizationUri(data.authorizationUri())
                    .clientId(data.clientId())
                    .redirectUri(data.redirectUri())
                    .state(data.state())
                    .authorizationRequestUri(data.authorizationRequestUri());
            if (data.scopes() != null) {
                builder.scopes(data.scopes());
            }
            if (data.additionalParameters() != null) {
                builder.additionalParameters(data.additionalParameters());
            }
            if (data.attributes() != null) {
                builder.attributes(data.attributes());
            }
            return builder.build();
        } catch (Exception ex) {
            log.warn("Failed to deserialize OAuth2 authorization request cookie", ex);
            return null;
        }
    }
}
