"""
Global exception handlers for CogniCare API
Centralizes error handling and response formatting
"""

import logging
from typing import Union

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.exceptions import CogniCareException

logger = logging.getLogger(__name__)


async def cognicare_exception_handler(
    request: Request, exc: CogniCareException
) -> JSONResponse:
    """
    Handle custom CogniCare exceptions
    
    Args:
        request: HTTP request
        exc: CogniCareException instance
        
    Returns:
        JSONResponse with error details and appropriate status code
    """
    logger.warning(f"CogniCare Exception: {exc.code} - {exc.message}")
    
    status_code_map = {
        "NOT_FOUND": 404,
        "VALIDATION_ERROR": 422,
        "UNAUTHORIZED": 401,
        "CONFLICT": 409,
        "REPOSITORY_ERROR": 500,
        "EXTERNAL_SERVICE_ERROR": 502,
    }
    
    status_code = status_code_map.get(exc.code, 500)
    
    return JSONResponse(
        status_code=status_code,
        content={
            "code": exc.code,
            "message": exc.message,
            "type": "CogniCareException",
        },
    )


async def general_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """
    Catch-all exception handler for unexpected errors
    
    Args:
        request: HTTP request
        exc: Exception instance
        
    Returns:
        JSONResponse with generic error message
    """
    logger.error(f"Unhandled exception: {type(exc).__name__}: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "code": "INTERNAL_ERROR",
            "message": "Internal server error",
            "type": "Exception",
        },
    )
