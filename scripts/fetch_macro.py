"""Busca as séries do painel macro no SGS do Banco Central e grava site/macro/data.json.

Roda no deploy (GitHub Actions) e localmente: python3 scripts/fetch_macro.py
Só usa a biblioteca padrão.
"""

import json
import sys
import time
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

YEARS = 5
OUT = Path(__file__).resolve().parent.parent / "site" / "macro" / "data.json"
SGS = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{code}/dados?formato=json&dataInicial={start}&dataFinal={end}"

# Códigos do SGS: https://www3.bcb.gov.br/sgspub
SELIC_META = 432  # Meta Selic definida pelo Copom, % a.a.
CDI_DAILY = 12  # CDI, % a.d.
IPCA_12M = 13522  # IPCA acumulado em 12 meses, %
PTAX_SELL = 1  # Dólar comercial (venda), PTAX, R$/US$


def fetch(code: int, start: date, end: date) -> list[tuple[str, float]]:
    url = SGS.format(code=code, start=start.strftime("%d/%m/%Y"), end=end.strftime("%d/%m/%Y"))
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=60) as resp:
                rows = json.load(resp)
            break
        except Exception as exc:  # a API do BCB oscila; tenta de novo antes de desistir
            if attempt == 3:
                raise RuntimeError(f"SGS {code}: {exc}") from exc
            time.sleep(2 ** (attempt + 1))
    points = []
    for row in rows:
        day = datetime.strptime(row["data"], "%d/%m/%Y").date()
        if day <= end:  # a meta Selic vem preenchida até a próxima reunião do Copom
            points.append((day.isoformat(), float(row["valor"])))
    if not points:
        raise RuntimeError(f"SGS {code}: série vazia")
    return points


def annualize_cdi(points: list[tuple[str, float]]) -> list[tuple[str, float]]:
    # Taxa diária -> anual em base 252 dias úteis: ((1 + d/100)^252 - 1) * 100
    return [(day, round(((1 + v / 100) ** 252 - 1) * 100, 2)) for day, v in points]


def real_rate(selic: list[tuple[str, float]], ipca: list[tuple[str, float]]) -> list[tuple[str, float]]:
    # Para cada mês com IPCA 12m: (1 + Selic meta no fim do mês) / (1 + IPCA 12m) - 1
    out = []
    for month, inflation in ipca:
        month_end = (date.fromisoformat(month).replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        rates = [v for day, v in selic if day <= month_end.isoformat()]
        if rates:
            out.append((month, round(((1 + rates[-1] / 100) / (1 + inflation / 100) - 1) * 100, 2)))
    return out


def main() -> None:
    end = datetime.now(timezone(timedelta(hours=-3))).date()  # horário de Brasília
    start = end.replace(year=end.year - YEARS) - timedelta(days=31)

    selic = fetch(SELIC_META, start, end)
    cdi = annualize_cdi(fetch(CDI_DAILY, start, end))
    ipca = fetch(IPCA_12M, start, end)
    ptax = fetch(PTAX_SELL, start, end)

    data = {
        "updated": datetime.now(timezone.utc).isoformat(timespec="minutes"),
        "series": {
            "selic": {"code": SELIC_META, "points": selic},
            "cdi": {"code": CDI_DAILY, "points": cdi},
            "ipca12": {"code": IPCA_12M, "points": ipca},
            "real": {"code": [SELIC_META, IPCA_12M], "points": real_rate(selic, ipca)},
            "ptax": {"code": PTAX_SELL, "points": ptax},
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":")))
    for key, s in data["series"].items():
        print(f"{key}: {len(s['points'])} pontos, último {s['points'][-1]}", file=sys.stderr)


if __name__ == "__main__":
    main()
