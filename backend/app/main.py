from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_KEY
from app.routers import rumors
from app.services.simulation import run_market_simulation
from app.agent import run_market_agent
from contextlib import asynccontextmanager
import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Lancement des tâches en arrière-plan au démarrage du serveur
    simulation_task = asyncio.create_task(run_market_simulation())
    agent_task = asyncio.create_task(run_market_agent())
    print("[Serveur] Simulation de marché et Agent IA initialisés en arrière-plan.")
    yield
    simulation_task.cancel()
    agent_task.cancel()

app = FastAPI(
    title="Marché Noir API",
    description="Backend en temps réel pour le jeu de trading et de manipulation.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app.include_router(rumors.router)


class OrderCreate(BaseModel):
    user_id: str
    asset_id: str
    order_type: str = Field(..., pattern="^(BUY|SELL)$")
    price: float = Field(..., gt=0)
    quantity: int = Field(..., gt=0)


@app.get("/")
def read_root():
    return {"status": "online", "message": "Bienvenue sur le serveur du Marché Noir."}


@app.get("/api/assets")
def get_assets():
    try:
        response = supabase.table("assets").select("*").execute()
        return {"assets": response.data}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des actifs : {str(e)}"
        )


@app.post("/api/orders", status_code=status.HTTP_201_CREATED)
def place_order(order: OrderCreate):
    try:
        order_data = {
            "user_id": order.user_id,
            "asset_id": order.asset_id,
            "order_type": order.order_type,
            "price": order.price,
            "quantity": order.quantity,
            "status": "PENDING"
        }
        response = supabase.table("order_book").insert(order_data).execute()
        return {
            "message": "Ordre enregistré avec succès dans le carnet.",
            "order": response.data
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Impossible de placer l'ordre : {str(e)}"
        )
