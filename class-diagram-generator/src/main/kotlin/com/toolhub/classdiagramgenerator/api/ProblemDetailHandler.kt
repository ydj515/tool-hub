package com.toolhub.classdiagramgenerator.api

import com.toolhub.classdiagramgenerator.input.ZipExtractor
import jakarta.validation.ConstraintViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ProblemDetail
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.multipart.MaxUploadSizeExceededException

@RestControllerAdvice
class ProblemDetailHandler {
    @ExceptionHandler(NoSuchElementException::class)
    fun handleNotFound(e: NoSuchElementException): ResponseEntity<ProblemDetail> =
        problem(HttpStatus.NOT_FOUND, "NOT_FOUND", e.message ?: "Resource not found")

    @ExceptionHandler(IllegalArgumentException::class)
    fun handleBadRequest(e: IllegalArgumentException): ResponseEntity<ProblemDetail> =
        problem(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", e.message ?: "Bad request")

    @ExceptionHandler(ConstraintViolationException::class)
    fun handleConstraintViolation(e: ConstraintViolationException): ResponseEntity<ProblemDetail> =
        problem(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", e.message ?: "Validation failed")

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(e: MethodArgumentNotValidException): ResponseEntity<ProblemDetail> =
        problem(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", e.bindingResult.toString())

    @ExceptionHandler(ZipExtractor.ZipSlipException::class)
    fun handleZipSlip(e: ZipExtractor.ZipSlipException): ResponseEntity<ProblemDetail> =
        problem(HttpStatus.BAD_REQUEST, "ZIP_SLIP", e.message ?: "Zip slip detected")

    @ExceptionHandler(MaxUploadSizeExceededException::class)
    fun handleTooLarge(
        @Suppress("UNUSED_PARAMETER") e: MaxUploadSizeExceededException,
    ): ResponseEntity<ProblemDetail> = problem(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "Upload exceeds limit")

    private fun problem(
        status: HttpStatus,
        code: String,
        detail: String,
    ): ResponseEntity<ProblemDetail> {
        val pd = ProblemDetail.forStatusAndDetail(status, detail)
        pd.title = status.reasonPhrase
        pd.setProperty("code", code)
        return ResponseEntity
            .status(status)
            .contentType(MediaType.APPLICATION_PROBLEM_JSON)
            .body(pd)
    }
}
