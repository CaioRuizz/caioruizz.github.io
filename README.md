# caioruiz.com

Site pessoal: introdução, projetos e contatos. Publicado em https://www.caioruiz.com.

HTML e CSS estáticos, sem build. Todo o conteúdo fica em `site/`: português em `site/index.html` e inglês em `site/en/index.html`.

## Rodar localmente

```sh
python3 scripts/fetch_macro.py   # baixa os dados do painel macro (site/macro/data.json)
python3 -m http.server -d site 8000
```

e abra http://localhost:8000.

## Deploy

Todo push na `main` publica a pasta `site/` na branch `gh-pages`
(workflow em `.github/workflows/deploy-pages.yml`). O domínio vem de `site/CNAME`.

O deploy também roda em dias úteis às 08:13 e 19:13 (horário de Brasília) para atualizar o painel macro
(`/macro/`): `scripts/fetch_macro.py` busca as séries no SGS do Banco Central antes de publicar. Se a API
falhar, o deploy falha e o site continua com os dados anteriores.
