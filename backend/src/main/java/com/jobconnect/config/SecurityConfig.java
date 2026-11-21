package com.jobconnect.config;

import com.jobconnect.security.HttpCookieOAuth2AuthorizationRequestRepository;
import com.jobconnect.security.JwtAuthenticationFilter;
import com.jobconnect.security.OAuth2AuthenticationFailureHandler;
import com.jobconnect.security.OAuth2AuthenticationSuccessHandler;
import com.jobconnect.security.RestSecurityHandlers;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RestSecurityHandlers restSecurityHandlers;
    private final ObjectProvider<ClientRegistrationRepository> clientRegistrationRepositoryProvider;
    private final ObjectProvider<HttpCookieOAuth2AuthorizationRequestRepository> cookieAuthRequestRepoProvider;
    private final ObjectProvider<OAuth2AuthenticationSuccessHandler> oAuth2SuccessHandlerProvider;
    private final ObjectProvider<OAuth2AuthenticationFailureHandler> oAuth2FailureHandlerProvider;

    @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173}")
    private String allowedOriginsRaw;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            RestSecurityHandlers restSecurityHandlers,
            ObjectProvider<ClientRegistrationRepository> clientRegistrationRepositoryProvider,
            ObjectProvider<HttpCookieOAuth2AuthorizationRequestRepository> cookieAuthRequestRepoProvider,
            ObjectProvider<OAuth2AuthenticationSuccessHandler> oAuth2SuccessHandlerProvider,
            ObjectProvider<OAuth2AuthenticationFailureHandler> oAuth2FailureHandlerProvider
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.restSecurityHandlers = restSecurityHandlers;
        this.clientRegistrationRepositoryProvider = clientRegistrationRepositoryProvider;
        this.cookieAuthRequestRepoProvider = cookieAuthRequestRepoProvider;
        this.oAuth2SuccessHandlerProvider = oAuth2SuccessHandlerProvider;
        this.oAuth2FailureHandlerProvider = oAuth2FailureHandlerProvider;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(restSecurityHandlers)
                .accessDeniedHandler(restSecurityHandlers)
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/error", "/api/health").permitAll()
                .requestMatchers("/api/auth/register", "/api/auth/login", "/api/auth/logout").permitAll()
                .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/jobs", "/api/jobs/search", "/api/jobs/{id}").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        ClientRegistrationRepository clientRegs = clientRegistrationRepositoryProvider.getIfAvailable();
        HttpCookieOAuth2AuthorizationRequestRepository cookieRepo = cookieAuthRequestRepoProvider.getIfAvailable();
        OAuth2AuthenticationSuccessHandler successHandler = oAuth2SuccessHandlerProvider.getIfAvailable();
        OAuth2AuthenticationFailureHandler failureHandler = oAuth2FailureHandlerProvider.getIfAvailable();

        if (clientRegs != null && cookieRepo != null && successHandler != null && failureHandler != null) {
            http.oauth2Login(oauth2 -> oauth2
                .authorizationEndpoint(endpoint -> endpoint
                    .baseUri("/oauth2/authorization")
                    .authorizationRequestRepository(cookieRepo)
                )
                .redirectionEndpoint(endpoint -> endpoint
                    .baseUri("/login/oauth2/code/*")
                )
                .successHandler(successHandler)
                .failureHandler(failureHandler)
            );
        }

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOriginsRaw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        configuration.setAllowedOriginPatterns(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Content-Disposition"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
