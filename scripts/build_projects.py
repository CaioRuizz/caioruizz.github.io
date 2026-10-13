"""Gera os cards de projetos de site/index.html (PT) e site/en/index.html (EN) a partir de projects.json.

Substitui o trecho entre <!-- projects:start --> e <!-- projects:end --> nas duas páginas.
Roda no deploy e localmente: python3 scripts/build_projects.py
Com --check, só confere se as páginas estão em dia com o JSON (sai com erro se não estiverem).
"""

import json
import sys
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "projects.json"
PAGES = {"pt": ROOT / "site" / "index.html", "en": ROOT / "site" / "en" / "index.html"}
START, END = "<!-- projects:start -->", "<!-- projects:end -->"

LABELS = {
    "pt": {
        "live": ("tag-live", "No ar"),
        "opensource": ("tag-live", "Open source"),
        "wip": ("tag-wip", "Em desenvolvimento"),
        "progress": "Andamento do projeto",
        "backlog": "Na fila",
        "next": "Próximo",
    },
    "en": {
        "live": ("tag-live", "Live"),
        "opensource": ("tag-live", "Open source"),
        "wip": ("tag-wip", "In development"),
        "progress": "Project progress",
        "backlog": "Up next",
        "next": "Next",
    },
}


def fail(msg: str) -> None:
    sys.exit(f"projects.json: {msg}")


def validate(data: dict) -> None:
    ids = set()
    for p in data["projects"]:
        pid = p.get("id") or fail("projeto sem id")
        if pid in ids:
            fail(f"id repetido: {pid}")
        ids.add(pid)
        if p.get("status") not in LABELS["pt"]:
            fail(f"{pid}: status deve ser live, opensource ou wip")
        for lang in PAGES:
            if lang not in p:
                fail(f"{pid}: falta a versão '{lang}'")
            for key in ("title", "tagline", "description"):
                if not p[lang].get(key):
                    fail(f"{pid}.{lang}: falta '{key}'")
        pt, en = p["pt"], p["en"]
        # as duas línguas precisam ter a mesma estrutura, senão os cards ficam diferentes
        for key in ("bullets", "steps"):
            if len(pt.get(key, [])) != len(en.get(key, [])):
                fail(f"{pid}: '{key}' tem tamanhos diferentes em pt e en")
        for key in ("link", "note"):
            if (key in pt) != (key in en):
                fail(f"{pid}: '{key}' existe só em uma das línguas")
        if "progress_done" in p and not pt.get("steps"):
            fail(f"{pid}: progress_done sem 'steps'")
    for i, item in enumerate(data.get("backlog", [])):
        for lang in PAGES:
            if not item.get(lang, {}).get("title") or not item.get(lang, {}).get("description"):
                fail(f"backlog[{i}]: falta título ou descrição em '{lang}'")


def render_project(p: dict, lang: str) -> str:
    c, L = p[lang], LABELS[lang]
    tag_class, tag_text = L[p["status"]]
    out = [
        '        <article class="card">',
        '          <div class="card-head">',
        f"            <h3>{escape(c['title'])}</h3>",
        f'            <span class="tag {tag_class}">{escape(tag_text)}</span>',
        "          </div>",
        f'          <p class="card-tagline">{escape(c["tagline"])}</p>',
        f"          <p>{escape(c['description'])}</p>",
    ]
    if c.get("bullets"):
        out.append('          <ul class="list">')
        for b in c["bullets"]:
            out.append(f"            <li><strong>{escape(b['label'])}:</strong> {escape(b['text'])}</li>")
        out.append("          </ul>")
    if c.get("steps"):
        done = p.get("progress_done", 0)
        out.append(f'          <div class="progress" aria-label="{escape(L["progress"])}">')
        for i, step in enumerate(c["steps"]):
            cls = ' class="done"' if i < done else ' class="now"' if i == done else ""
            out.append(f"            <span{cls}>{escape(step)}</span>")
        out.append("          </div>")
    if c.get("link"):
        href = c["link"]["href"]
        external = ' target="_blank" rel="noopener"' if href.startswith("http") else ""
        out.append(f'          <a class="card-link" href="{escape(href)}"{external}>{escape(c["link"]["label"])} →</a>')
    if c.get("note"):
        out.append(f'          <p class="note">{escape(c["note"])}</p>')
    out.append("        </article>")
    return "\n".join(out)


def render_backlog(items: list, lang: str) -> str:
    L = LABELS[lang]
    out = [
        '        <article class="card card-backlog">',
        '          <div class="card-head">',
        f"            <h3>{escape(L['backlog'])}</h3>",
        "          </div>",
        '          <ul class="backlog-list">',
    ]
    for item in items:
        c = item[lang]
        tag = f' <span class="tag tag-wip">{escape(L["next"])}</span>' if item.get("next") else ""
        out += [
            "            <li>",
            f'              <div class="backlog-head"><strong>{escape(c["title"])}</strong>{tag}</div>',
            f"              <p>{escape(c['description'])}</p>",
            "            </li>",
        ]
    out += ["          </ul>", "        </article>"]
    return "\n".join(out)


def render(data: dict, lang: str) -> str:
    blocks = [render_project(p, lang) for p in data["projects"]]
    if data.get("backlog"):
        blocks.append(render_backlog(data["backlog"], lang))
    return "\n\n".join(blocks)


def main() -> None:
    check = "--check" in sys.argv
    data = json.loads(SOURCE.read_text())
    validate(data)
    stale = []
    for lang, page in PAGES.items():
        html = page.read_text()
        if html.count(START) != 1 or html.count(END) != 1:
            sys.exit(f"{page}: marcadores {START} / {END} não encontrados")
        head, rest = html.split(START)
        _, tail = rest.split(END)
        new = f"{head}{START}\n{render(data, lang)}\n        {END}{tail}"
        if new != html:
            stale.append(page.relative_to(ROOT))
            if not check:
                page.write_text(new)
    if check and stale:
        sys.exit("desatualizado em relação ao projects.json: " + ", ".join(map(str, stale)))
    print("projetos:", "atualizados " + ", ".join(map(str, stale)) if stale else "nada a mudar", file=sys.stderr)


if __name__ == "__main__":
    main()
