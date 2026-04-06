from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
import models
from database import get_db

router = APIRouter(
    prefix="/stats",
    tags=["stats"],
    responses={404: {"description": "Not found"}},
)

@router.get("/plasticity")
def get_plasticity_stats(db: Session = Depends(get_db)):
    """
    Agrega o XP ganho agrupando-os por Categoria, para calcular Levels e Progresso atual.
    """
    results = db.query(
        models.ExecutionLog.category, 
        func.sum(models.ExecutionLog.xp_gained).label("total_xp")
    ).group_by(models.ExecutionLog.category).all()
    
    stats = []
    category_map = {row.category: row.total_xp for row in results}
    
    # Categorias Core para ter um fallback/base visual
    base_categories = ["Petróleo", "Software", "Pesquisa"]
    
    for cat in base_categories:
        total = category_map.get(cat, 0.0)
        level = int(total // 50)
        progress = total % 50
        stats.append({
            "category": cat,
            "total_xp": total,
            "level": level,
            "progress": progress
        })
        
    # Adicionar extras criadas dinamicamente
    for cat, total in category_map.items():
        if cat not in base_categories and cat != "Geral":
             level = int(total // 50)
             progress = total % 50
             stats.append({
                 "category": cat,
                 "total_xp": total,
                 "level": level,
                 "progress": progress
             })

    return stats
