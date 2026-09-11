from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field
from app.auth import require_user
from app.database import supabase

router = APIRouter(prefix="/api/rumors", tags=["Rumors"])


class RumorCreate(BaseModel):
    asset_id: str
    content: str = Field(..., max_length=140)
    impact_score: float = Field(..., ge=-1.0, le=1.0)


@router.get("/")
def get_rumors():
    try:
        response = supabase.table("rumors").select("*, assets(name)").order("created_at", desc=True).limit(20).execute()
        return {"rumors": response.data}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des rumeurs : {str(e)}"
        )


@router.post("/", status_code=status.HTTP_201_CREATED)
def post_rumor(rumor: RumorCreate, authorization: str | None = Header(default=None)):
    user = require_user(authorization)

    try:
        rumor_data = {
            "author_id": str(user.id),
            "asset_id": rumor.asset_id,
            "content": rumor.content,
            "impact_score": rumor.impact_score
        }
        response = supabase.table("rumors").insert(rumor_data).execute()

        asset_res = supabase.table("assets").select("current_price").eq("id", rumor.asset_id).single().execute()
        if asset_res.data:
            current_price = asset_res.data["current_price"]
            price_variation = current_price * (rumor.impact_score * 0.05)
            new_price = round(max(0.01, current_price + price_variation), 2)

            supabase.table("assets").update({"current_price": new_price}).eq("id", rumor.asset_id).execute()

        return {
            "message": "Rumeur injectée dans le réseau avec succès. Le marché réagit.",
            "rumor": response.data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Impossible de propager la rumeur : {str(e)}"
        )
