from pydantic import BaseModel
from typing import Optional
from enum import Enum


class Side(str, Enum):
    BUY = "buy"
    SELL = "sell"


class Order(BaseModel):
    asset: str
    side: Side
    quantity: float
    price: float


class Rumor(BaseModel):
    asset: str
    content: str
    impact: float  # -1.0 (bearish) to 1.0 (bullish)
    source: Optional[str] = "anonymous"
