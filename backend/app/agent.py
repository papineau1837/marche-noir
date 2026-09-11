import asyncio
import random
from app.database import supabase

# Liste de personnalités de l'agent pour ses rumeurs
AGENT_PERSONNAS = [
    {"username": "Ghost_Trader", "tone": "alarmist", "multiplier": -0.10},
    {"username": "Insider_99", "tone": "optimistic", "multiplier": 0.10},
    {"username": "Cartel_Bot", "tone": "neutral", "multiplier": 0.03},
    {"username": "Shadow_Yakuza", "tone": "bearish", "multiplier": -0.05},
    {"username": "Market_Maker", "tone": "technical", "multiplier": 0.01},
]

async def run_market_agent():
    """Exécute une boucle autonome où l'agent analyse le marché et réagit."""
    print("[Agent IA] Démarrage du bot autonome sur le Marché Noir...")
    
    while True:
        try:
            # 1. Récupérer les actifs actuels
            assets_res = supabase.table("assets").select("*").execute()
            assets = assets_res.data
            
            if assets:
                # Choisir un actif au hasard
                target_asset = random.choice(assets)
                persona = random.choice(AGENT_PERSONNAS)
                
                # Générer un contenu de rumeur selon la personnalité
                if persona["tone"] == "alarmist":
                    content = f"ALERTE : Fuite massive détectée sur {target_asset['name']}. Liquidez vos positions."
                    impact = -persona["multiplier"]
                elif persona["tone"] == "optimistic":
                    content = f"Rumeur solide : Un cartel s'appuie massivement sur {target_asset['name']}. Ça va exploser."
                    impact = persona["multiplier"]
                elif persona["tone"] == "bearish":
                    content = f"Le marché tourne au ralenti sur {target_asset['name']}. Attention aux ventes précipitées."
                    impact = -persona["multiplier"] * 0.5
                elif persona["tone"] == "technical":
                    content = f"Indicateurs techniques sur {target_asset['name']} suggèrent une correction à court terme."
                    impact = 0
                else:
                    content = f"Mouvement suspect observé sur le carnet d'ordres de {target_asset['name']}."
                    impact = random.uniform(-0.03, 0.03)

                # Trouver un profil système ou utiliser un bot ID
                # (On peut utiliser un UUID de bot fixe ou récupérer un utilisateur admin)
                try:
                    profiles_res = supabase.table("profiles").select("id").limit(1).execute()
                    if profiles_res.data:
                        bot_id = profiles_res.data[0]["id"]
                    else:
                        # Si pas de profil, on utilise l'ID du premier actif comme placeholder
                        bot_id = target_asset["id"]
                except Exception:
                    bot_id = target_asset["id"]

                # Poster la rumeur via l'agent
                rumor_data = {
                    "author_id": bot_id,
                    "asset_id": target_asset["id"],
                    "content": content[:140],
                    "impact_score": round(impact, 2)
                }
                supabase.table("rumors").insert(rumor_data).execute()

                # Impacter immédiatement le prix de l'actif
                current_price = float(target_asset["current_price"])
                new_price = round(max(0.01, current_price * (1 + impact)), 2)
                supabase.table("assets").update({"current_price": new_price}).eq("id", target_asset["id"]).execute()

                print(f"[Agent IA] Rumeur injectée par {persona['username']} sur {target_asset['name']} (Variation: {impact*100:.1f}%, Nouveau prix: {new_price}$)")

        except Exception as e:
            print(f"[Agent IA Erreur] {str(e)}")
            await asyncio.sleep(30)  # Attente plus courte en cas d'erreur

        # Attendre entre 45 et 90 secondes avant la prochaine action de l'agent
        await asyncio.sleep(random.randint(45, 90))

if __name__ == "__main__":
    asyncio.run(run_market_agent())
