"""Message API routes"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from app.dto.message_dto import CreateMessageDTO, MessageResponseDTO
from app.service.message_service import MessageService
from app.api.dependencies import get_repository, get_current_user_id
from app.core.exceptions import ValidationError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/messages", tags=["messages"])


async def get_message_service() -> MessageService:
    """Dependency injection for MessageService"""
    repository = get_repository("messages")
    return MessageService(repository)


@router.post("", response_model=MessageResponseDTO, status_code=201)
async def create_message(
    dto: CreateMessageDTO = Body(...),
    user_id: str = Depends(get_current_user_id),
    service: MessageService = Depends(get_message_service)
) -> MessageResponseDTO:
    """
    Create a new message
    
    Requires:
        - Bearer token in Authorization header
    
    Args:
        dto: Message data
        user_id: User creating the message (from token)
        
    Returns:
        Created message with ID
        
    Raises:
        HTTPException 400: If message data is invalid
        HTTPException 401: If not authenticated
        HTTPException 500: If creation fails
    """
    try:
        logger.info(f"Creating message for user: {user_id}")
        return await service.create_message(user_id, dto)
    except ValidationError as e:
        logger.warning(f"Validation error creating message: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating message: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create message")


@router.get("", response_model=List[MessageResponseDTO])
async def list_messages(
    skip: int = Query(0, ge=0, description="Number to skip"),
    limit: int = Query(50, ge=1, le=50, description="Max results"),
    user_id: str = Depends(get_current_user_id),
    service: MessageService = Depends(get_message_service)
) -> List[MessageResponseDTO]:
    """
    List messages for a user with pagination
    
    Requires:
        - Bearer token in Authorization header
    
    Args:
        skip: Number of messages to skip
        limit: Maximum messages to return
        user_id: User ID (from token)
        
    Returns:
        List of messages
        
    Raises:
        HTTPException 401: If not authenticated
        HTTPException 500: If retrieval fails
    """
    try:
        logger.info(f"Listing messages for user: {user_id}, skip={skip}, limit={limit}")
        return await service.list_messages(user_id, skip, limit)
    except Exception as e:
        logger.error(f"Error listing messages: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list messages")


@router.get("/search", response_model=List[MessageResponseDTO])
async def search_messages(
    query: str = Query(..., min_length=1, description="Search query"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    user_id: str = Depends(get_current_user_id),
    service: MessageService = Depends(get_message_service)
) -> List[MessageResponseDTO]:
    """
    Search messages by content and/or tags
    
    Requires:
        - Bearer token in Authorization header
    
    Args:
        query: Search query string
        tags: Optional tags to filter by
        user_id: User ID (from token)
        
    Returns:
        List of matching messages
        
    Raises:
        HTTPException 401: If not authenticated
        HTTPException 500: If search fails
    """
    try:
        logger.info(f"Searching messages for user: {user_id}, query='{query}', tags={tags}")
        return await service.search_messages(user_id, query, tags)
    except Exception as e:
        logger.error(f"Error searching messages: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to search messages")


@router.get("/{message_id}", response_model=MessageResponseDTO)
async def get_message(
    message_id: str,
    user_id: str = Depends(get_current_user_id),
    service: MessageService = Depends(get_message_service)
) -> MessageResponseDTO:
    """
    Get a specific message by ID
    
    Requires:
        - Bearer token in Authorization header
    
    Args:
        message_id: Message ID to retrieve
        user_id: User ID (from token, used as partition key)
        
    Returns:
        Message response
        
    Raises:
        HTTPException 401: If not authenticated
        HTTPException 404: If message not found
        HTTPException 500: If retrieval fails
    """
    try:
        logger.info(f"Fetching message: {message_id} for user: {user_id}")
        result = await service.get_message(user_id, message_id)
        if not result:
            raise HTTPException(status_code=404, detail="Message not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching message: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch message")


@router.delete("/{message_id}", status_code=204)
async def delete_message(
    message_id: str,
    user_id: str = Depends(get_current_user_id),
    service: MessageService = Depends(get_message_service)
) -> None:
    """
    Delete a message
    
    Requires:
        - Bearer token in Authorization header
    
    Args:
        message_id: Message ID to delete
        user_id: User ID (from token, used as partition key)
        
    Raises:
        HTTPException 401: If not authenticated
        HTTPException 404: If message not found
        HTTPException 500: If deletion fails
    """
    try:
        logger.info(f"Deleting message: {message_id} for user: {user_id}")
        success = await service.delete_message(user_id, message_id)
        if not success:
            raise HTTPException(status_code=404, detail="Message not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting message: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete message")
