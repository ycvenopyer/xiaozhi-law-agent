"""Public catalog served by the local CloudBase browser mocks."""
import json
from pathlib import Path

seed = Path(__file__).resolve().parents[1] / 'database/seeds/public_knowledge.sql'
PUBLIC_CATALOG = json.loads(seed.read_text(encoding='utf-8').split('$catalog$')[1])
