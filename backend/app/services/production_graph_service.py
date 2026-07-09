"""
production_graph_service.py

Director Sync™ — Production intelligence engine.

Computes a dependency graph of all project assets (Characters, Environments,
Voices, Storyboard Panels, Scene Videos, Poster, Trailer) entirely from the
existing database, with no persistent JSON graph stored on the Project row.

Stale state is tracked via Redis short-lived keys (5-minute TTL).
Graph is rebuilt fresh on each API call — no stale-state fights.
"""

import json
import logging
import re
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# ── Credit & Time cost constants ─────────────────────────────────────────────
ASSET_CREDITS = {
    "scene":       80,
    "voice":       10,
    "character":   20,
    "environment": 20,
    "storyboard":  15,
    "poster":      15,
    "trailer":     15,
}
ASSET_SECONDS = {
    "scene":       30,
    "voice":       10,
    "character":   15,
    "environment": 15,
    "storyboard":  10,
    "poster":      12,
    "trailer":     12,
}

# Redis TTL values
STALE_TTL = 300       # 5 minutes
GRAPH_CACHE_TTL = 120  # 2 minutes


def _make_redis_stale_key(project_id: int) -> str:
    return f"director_sync:stale:{project_id}"


def _make_redis_graph_key(project_id: int) -> str:
    return f"director_sync:graph:{project_id}"


# ── Internal graph builder ────────────────────────────────────────────────────

def _build_graph_sync(db, project_id: int) -> dict:
    """
    Build the dependency graph synchronously from the database.
    Returns: { nodes: [...], edges: [...] }
    """
    from app.db.models import Project, CharacterAsset, EnvironmentAsset, VoiceAsset, SceneVideo

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return {"nodes": [], "edges": []}

    nodes: list = []
    edges: list = []

    storyboard = project.storyboard or []
    scene_breakdown = project.scene_breakdown or {}
    breakdown_scenes = scene_breakdown.get("scenes", [])

    def add_node(id: str, type: str, label: str, meta: Optional[dict] = None):
        nodes.append({"id": id, "type": type, "label": label, "meta": meta or {}})

    def add_edge(src: str, dst: str, label: str = "depends_on"):
        # Avoid duplicate edges
        for e in edges:
            if e["from"] == src and e["to"] == dst:
                return
        edges.append({"from": src, "to": dst, "label": label})

    # ── 1. Character nodes ─────────────────────────────────────────────────
    char_assets = (
        db.query(CharacterAsset)
        .filter(CharacterAsset.project_id == project_id)
        .all()
    )
    char_names: set = set()
    char_canonical: dict = {}  # lower -> canonical name
    for ca in char_assets:
        cname = ca.character_name.strip()
        cname_lower = cname.lower()
        if cname_lower in char_canonical:
            continue  # skip duplicate versions of the same character
        char_names.add(cname_lower)
        char_canonical[cname_lower] = cname
        nid = f"character:{cname}"
        add_node(nid, "character", cname, {
            "image_url": ca.image_url,
            "updated_at": ca.updated_at.isoformat() if ca.updated_at else None,
        })

    # ── 2. Voice nodes ─────────────────────────────────────────────────────
    voice_assets = (
        db.query(VoiceAsset)
        .filter(VoiceAsset.project_id == project_id)
        .all()
    )
    voice_names: set = set()
    voice_canonical: dict = {}
    for va in voice_assets:
        vname = va.character_name.strip()
        vname_lower = vname.lower()
        if vname_lower in voice_canonical:
            continue
        voice_names.add(vname_lower)
        voice_canonical[vname_lower] = vname
        nid = f"voice:{vname}"
        add_node(nid, "voice", f"{vname} (Voice)", {
            "preview_url": va.preview_url,
            "voice_signature": va.voice_signature,
            "updated_at": va.updated_at.isoformat() if va.updated_at else None,
        })
        # Character -> Voice edge
        if vname_lower in char_names:
            add_edge(f"character:{char_canonical[vname_lower]}", nid)

    # ── 3. Environment nodes ───────────────────────────────────────────────
    env_assets = (
        db.query(EnvironmentAsset)
        .filter(EnvironmentAsset.project_id == project_id)
        .all()
    )
    env_canonical: dict = {}  # lower -> canonical
    for ea in env_assets:
        ename = ea.environment_name.strip()
        ename_lower = ename.lower()
        if ename_lower in env_canonical:
            continue
        env_canonical[ename_lower] = ename
        nid = f"environment:{ename}"
        add_node(nid, "environment", ename, {
            "image_url": ea.image_url,
            "updated_at": ea.updated_at.isoformat() if ea.updated_at else None,
        })

    # ── 4. Scene nodes (from scene_breakdown or storyboard) ────────────────
    raw_scenes = list(breakdown_scenes) if breakdown_scenes else []
    if not raw_scenes:
        for idx, sb in enumerate(storyboard):
            raw_scenes.append({
                "scene_number": f"SCENE {str(idx + 1).zfill(2)}",
                "summary": sb.get("description", ""),
                "location": sb.get("environment", ""),
                "characters": [],
            })

    scene_node_ids: list = []
    for sc in raw_scenes:
        raw_num = sc.get("scene_number", "")
        digits = re.findall(r"\d+", str(raw_num))
        snum = int(digits[0]) if digits else 0
        if snum == 0:
            continue
        scene_label = f"Scene {snum:02d}"
        nid = f"scene:{snum}"
        add_node(nid, "scene", scene_label, {
            "location": sc.get("location") or sc.get("environment", ""),
            "characters": sc.get("characters", []),
            "summary": sc.get("summary", ""),
        })
        scene_node_ids.append(nid)

        # Character & Voice → Scene edges
        sc_chars = sc.get("characters", [])
        if isinstance(sc_chars, str):
            sc_chars = [sc_chars]
        for ch in sc_chars:
            ch_lower = ch.strip().lower() if ch else ""
            if ch_lower and ch_lower in char_canonical:
                add_edge(f"character:{char_canonical[ch_lower]}", nid)
            if ch_lower and ch_lower in voice_canonical:
                add_edge(f"voice:{voice_canonical[ch_lower]}", nid)

        # Environment → Scene edge
        loc = (sc.get("location") or sc.get("environment") or "").lower().strip()
        if loc:
            for env_lower, env_can in env_canonical.items():
                if env_lower in loc or loc in env_lower:
                    add_edge(f"environment:{env_can}", nid)
                    break

        # Storyboard panel → Scene edge
        if snum <= len(storyboard):
            sb_nid = f"storyboard:{snum}"
            add_node(sb_nid, "storyboard", f"Storyboard {snum:02d}", {
                "panel_index": snum,
            })
            add_edge(sb_nid, nid)

    # ── 5. Poster node ─────────────────────────────────────────────────────
    add_node("poster:main", "poster", "Poster", {})
    for char_lower, char_can in char_canonical.items():
        add_edge(f"character:{char_can}", "poster:main")
    for snid in scene_node_ids:
        add_edge(snid, "poster:main")

    # ── 6. Trailer node ────────────────────────────────────────────────────
    add_node("trailer:main", "trailer", "Trailer", {})
    for snid in scene_node_ids:
        add_edge(snid, "trailer:main")

    return {"nodes": nodes, "edges": edges}


# ── Downstream traversal ──────────────────────────────────────────────────────

def _downstream_nodes(graph: dict, start_id: str) -> list:
    """BFS from start_id following directed edges to find all downstream nodes."""
    adjacency: dict = {}
    for e in graph["edges"]:
        adjacency.setdefault(e["from"], []).append(e["to"])

    visited: set = set()
    queue = [start_id]
    while queue:
        current = queue.pop(0)
        for neighbor in adjacency.get(current, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    return list(visited)


# ── Public Service Class ──────────────────────────────────────────────────────

class ProductionGraphService:

    # ── Build graph ───────────────────────────────────────────────────────
    async def build_graph(self, db, project_id: int) -> dict:
        """Build (or return Redis-cached) the full dependency graph."""
        try:
            from app.core.redis import redis_manager
            client = await redis_manager.get_client()
            cached = await client.get(_make_redis_graph_key(project_id))
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Redis unavailable for graph cache: {e}")

        graph = _build_graph_sync(db, project_id)

        try:
            from app.core.redis import redis_manager
            client = await redis_manager.get_client()
            await client.setex(
                _make_redis_graph_key(project_id),
                GRAPH_CACHE_TTL,
                json.dumps(graph)
            )
        except Exception:
            pass

        return graph

    def build_graph_sync(self, db, project_id: int) -> dict:
        """Synchronous version (for use in sync route handlers)."""
        return _build_graph_sync(db, project_id)

    # ── Mark stale ────────────────────────────────────────────────────────
    async def mark_stale(self, project_id: int, asset_type: str, asset_name: str) -> None:
        """Write a Redis key noting which asset node is dirty. Busts graph cache."""
        stale_key = _make_redis_stale_key(project_id)
        graph_key = _make_redis_graph_key(project_id)
        node_id = f"{asset_type}:{asset_name}"
        try:
            from app.core.redis import redis_manager
            client = await redis_manager.get_client()
            existing_raw = await client.get(stale_key)
            existing: list = json.loads(existing_raw) if existing_raw else []
            if node_id not in existing:
                existing.append(node_id)
            await client.setex(stale_key, STALE_TTL, json.dumps(existing))
            await client.delete(graph_key)
        except Exception as e:
            logger.warning(f"Redis unavailable for mark_stale: {e}")

    async def get_stale_nodes(self, project_id: int) -> list:
        """Return list of currently stale root node IDs."""
        try:
            from app.core.redis import redis_manager
            client = await redis_manager.get_client()
            raw = await client.get(_make_redis_stale_key(project_id))
            return json.loads(raw) if raw else []
        except Exception:
            return []

    async def clear_stale_nodes(self, project_id: int) -> None:
        """Clear all stale markers for a project (after successful sync)."""
        try:
            from app.core.redis import redis_manager
            client = await redis_manager.get_client()
            await client.delete(_make_redis_stale_key(project_id))
            await client.delete(_make_redis_graph_key(project_id))
        except Exception:
            pass

    # ── Analyze impact ────────────────────────────────────────────────────
    async def analyze_impact(
        self,
        db,
        project_id: int,
        asset_type: str,
        asset_name: str,
    ) -> dict:
        """
        Given an asset that has changed, find all downstream affected nodes
        and compute total estimated credits & time.
        """
        graph = await self.build_graph(db, project_id)
        node_id = f"{asset_type}:{asset_name}"
        node_map: dict = {n["id"]: n for n in graph["nodes"]}

        downstream = _downstream_nodes(graph, node_id)

        affected: list = []
        total_credits = 0
        total_seconds = 0

        for nid in downstream:
            meta = node_map.get(nid, {})
            ntype = meta.get("type", nid.split(":")[0] if ":" in nid else "unknown")
            nlabel = meta.get("label", nid)
            credits = ASSET_CREDITS.get(ntype, 0)
            secs = ASSET_SECONDS.get(ntype, 0)
            total_credits += credits
            total_seconds += secs
            affected.append({
                "id": nid,
                "type": ntype,
                "label": nlabel,
                "estimated_credits": credits,
                "estimated_seconds": secs,
            })

        mins = total_seconds // 60
        secs_rem = total_seconds % 60
        time_str = f"{mins}m {secs_rem}s" if mins else f"{secs_rem}s"

        return {
            "changed_node": node_id,
            "changed_label": node_map.get(node_id, {}).get("label", asset_name),
            "affected_nodes": affected,
            "total_credits": total_credits,
            "total_seconds": total_seconds,
            "time_formatted": time_str,
            "summary": (
                f"{asset_name} has changed. {len(affected)} downstream asset(s) affected. "
                f"Estimated: {total_credits} credits · {time_str}."
            ),
        }

    # ── Sync status ───────────────────────────────────────────────────────
    async def get_sync_status(self, db, project_id: int) -> dict:
        """Returns per-category health and overall project sync status."""
        stale_roots = await self.get_stale_nodes(project_id)

        stale_set: set = set(stale_roots)
        if stale_roots:
            graph = await self.build_graph(db, project_id)
            expanded: set = set(stale_roots)
            for sn in stale_roots:
                expanded.update(_downstream_nodes(graph, sn))
            stale_set = expanded

        def cat_status(prefix: str) -> str:
            for nid in stale_set:
                if nid.startswith(prefix):
                    return "out_of_sync"
            return "synced"

        overall = "out_of_sync" if stale_set else "synced"

        return {
            "overall": overall,
            "stale_count": len(stale_set),
            "stale_nodes": list(stale_set),
            "categories": {
                "characters":   cat_status("character:"),
                "voices":       cat_status("voice:"),
                "environments": cat_status("environment:"),
                "scenes":       cat_status("scene:"),
                "storyboard":   cat_status("storyboard:"),
                "poster":       cat_status("poster:"),
                "trailer":      cat_status("trailer:"),
            },
            "last_checked": datetime.now(timezone.utc).isoformat(),
        }

    # ── Propagate ─────────────────────────────────────────────────────────
    async def propagate(self, db, project_id: int, affected_node_ids: Optional[list] = None) -> dict:
        """
        Mark stale nodes as re-synced (clears stale state).
        Real AI generation is triggered separately via /api/generate/* endpoints.
        """
        stale = await self.get_stale_nodes(project_id)
        if affected_node_ids:
            to_clear = [n for n in stale if n in affected_node_ids]
        else:
            to_clear = stale

        await self.clear_stale_nodes(project_id)

        return {
            "propagated_nodes": to_clear,
            "message": f"Production synchronized. {len(to_clear)} node(s) updated.",
        }


# Singleton instance
production_graph_service = ProductionGraphService()
