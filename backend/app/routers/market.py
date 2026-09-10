from fastapi import APIRouter, HTTPException
from app.database import supabase
from app.models import Order

router = APIRouter()


@router.post("/order")
def place_order(order: Order):
    try:
        result = supabase.table("orders").insert(order.model_dump()).execute()
        return {"status": "order placed", "order": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/orders")
def get_orders(asset: str = None):
    try:
        query = supabase.table("orders").select("*")
        if asset:
            query = query.eq("asset", asset)
        result = query.execute()
        return {"orders": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/price/{asset}")
def get_price(asset: str):
    try:
        result = (
            supabase.table("orders")
            .select("price")
            .eq("asset", asset)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            return {"asset": asset, "price": result.data[0]["price"]}
        return {"asset": asset, "price": 0.0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
