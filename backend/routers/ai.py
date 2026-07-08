from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from pydantic import BaseModel
from typing import Dict, Any, List

from backend.database import get_session
from backend.services.ai_service import AIService
from backend.auth_utils import get_current_user
from backend.models import User

router = APIRouter(prefix="/ai", tags=["ai"])

class ChatRequest(BaseModel):
    query: str

class ChatResponse(BaseModel):
    response: str

@router.get("/forecast")
def get_sales_forecast(
    days: int = 7,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get mathematical sales forecast for the next N days.
    """
    try:
        return AIService.forecast_sales(session, days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecasting error: {str(e)}")

@router.get("/inventory-prediction")
def get_inventory_demand(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Predict depletion times and recommended reorder amounts for all stock.
    """
    try:
        return AIService.predict_inventory_demand(session)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stock prediction error: {str(e)}")

@router.get("/insights")
def get_business_insights(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Expose smart performance insights on operations.
    """
    try:
        return AIService.get_performance_insights(session)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating insights: {str(e)}")

@router.post("/chat", response_model=ChatResponse)
def chat_assistant(
    req: ChatRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Chat bot responding to custom operational questions based on the database.
    """
    try:
        ans = AIService.answer_query(session, req.query)
        return ChatResponse(response=ans)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat assistant error: {str(e)}")
