"""Custom exceptions for CogniCare API"""


class CogniCareException(Exception):
    """Base exception for all CogniCare errors"""

    def __init__(self, message: str, code: str = "INTERNAL_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)


class EntityNotFoundError(CogniCareException):
    """Raised when an entity is not found"""

    def __init__(self, entity_type: str, entity_id: str):
        message = f"{entity_type} with ID '{entity_id}' not found"
        super().__init__(message, "NOT_FOUND")


class ValidationError(CogniCareException):
    """Raised when validation fails"""

    def __init__(self, message: str):
        super().__init__(message, "VALIDATION_ERROR")


class UnauthorizedError(CogniCareException):
    """Raised when user is not authorized"""

    def __init__(self, message: str = "Unauthorized access"):
        super().__init__(message, "UNAUTHORIZED")


class ConflictError(CogniCareException):
    """Raised when a conflict occurs"""

    def __init__(self, message: str):
        super().__init__(message, "CONFLICT")


class RepositoryError(CogniCareException):
    """Raised when repository operation fails"""

    def __init__(self, message: str):
        super().__init__(message, "REPOSITORY_ERROR")


class ExternalServiceError(CogniCareException):
    """Raised when external service call fails"""

    def __init__(self, service: str, message: str):
        msg = f"External service '{service}' error: {message}"
        super().__init__(msg, "EXTERNAL_SERVICE_ERROR")
