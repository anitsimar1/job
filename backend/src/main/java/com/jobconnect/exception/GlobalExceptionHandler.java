package com.jobconnect.exception;

import com.jobconnect.dto.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(
            ResourceNotFoundException ex, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage(), request.getRequestURI(), null);
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ApiErrorResponse> handleConflict(
            DuplicateResourceException ex, HttpServletRequest request) {
        return build(HttpStatus.CONFLICT, "DUPLICATE_RESOURCE", ex.getMessage(), request.getRequestURI(), null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrity(
            DataIntegrityViolationException ex, HttpServletRequest request) {
        log.warn("Data integrity violation on {}: {}", request.getRequestURI(), ex.getMostSpecificCause().getMessage());
        return build(HttpStatus.CONFLICT, "DATA_INTEGRITY_ERROR",
                "A conflicting or invalid database record prevented this operation.",
                request.getRequestURI(), null);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiErrorResponse> handleBadRequest(
            BadRequestException ex, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "BAD_REQUEST", ex.getMessage(), request.getRequestURI(), null);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleMalformedJson(
            HttpMessageNotReadableException ex, HttpServletRequest request) {
        log.warn("Malformed request body on {}: {}", request.getRequestURI(), ex.getMessage());
        return build(HttpStatus.BAD_REQUEST, "MALFORMED_JSON",
                "Invalid JSON request payload.", request.getRequestURI(), null);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "INVALID_PARAMETER",
                "Invalid parameter value for '" + ex.getName() + "'.",
                request.getRequestURI(), null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError err : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.putIfAbsent(err.getField(), err.getDefaultMessage());
        }
        String firstMsg = fieldErrors.values().stream().findFirst().orElse("Validation failed");
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", firstMsg, request.getRequestURI(), fieldErrors);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiErrorResponse> handleMaxSize(
            MaxUploadSizeExceededException ex, HttpServletRequest request) {
        return build(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE",
                "Uploaded file exceeds the maximum allowed size of 10MB.", request.getRequestURI(), null);
    }

    @ExceptionHandler({BadCredentialsException.class, AuthenticationException.class})
    public ResponseEntity<ApiErrorResponse> handleAuth(
            AuthenticationException ex, HttpServletRequest request) {
        return build(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED",
                "Invalid email or password", request.getRequestURI(), null);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(
            AccessDeniedException ex, HttpServletRequest request) {
        return build(HttpStatus.FORBIDDEN, "FORBIDDEN",
                ex.getMessage() != null ? ex.getMessage() : "You do not have permission to access this resource.",
                request.getRequestURI(), null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGeneric(
            Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception on {} {}", request.getMethod(), request.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "An unexpected server error occurred.", request.getRequestURI(), null);
    }

    private ResponseEntity<ApiErrorResponse> build(
            HttpStatus status, String code, String message, String path, Map<String, String> fieldErrors) {
        return ResponseEntity.status(status).body(
                new ApiErrorResponse(status.value(), code, message, path, Instant.now(), fieldErrors)
        );
    }
}
