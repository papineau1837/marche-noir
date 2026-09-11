import asyncio
import random
from app.database import supabase


async def run_market_simulation():
    while True:
        try:
            response = supabase.table("assets").select("id, current_price").execute()
            assets = response.data

            if assets:
                for asset in assets:
                    current_price = float(asset["current_price"])
                    variation_percent = random.uniform(-0.03, 0.032)
                    new_price = round(current_price * (1 + variation_percent), 2)

                    if new_price < 0.01:
                        new_price = 0.01

                    supabase.table("assets").update({"current_price": new_price}).eq("id", asset["id"]).execute()

                print("[Simulation] Prix du Marché Noir mis à jour avec succès.")

        except Exception as e:
            print(f"[Simulation Erreur] Impossible de mettre à jour le marché : {str(e)}")

        await asyncio.sleep(10)
