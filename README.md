# caioruiz.com

Site pessoal: introdução, projetos e contatos. Publicado em https://www.caioruiz.com.

HTML e CSS estáticos, sem build. Todo o conteúdo fica em `site/`: português em `site/index.html` e inglês em `site/en/index.html`.

## Projetos

Os cards da seção de projetos (e o card "Na fila") vêm de `projects.json`, com o texto em português (`pt`)
e em inglês (`en`) lado a lado. Para adicionar ou mudar um projeto, edite o JSON e rode:

```sh
python3 scripts/build_projects.py
```

O script valida o arquivo (as duas línguas precisam ter a mesma estrutura) e reescreve o trecho entre
`<!-- projects:start -->` e `<!-- projects:end -->` em `site/index.html` e `site/en/index.html`. O deploy
roda o mesmo script, então um projeto editado só no JSON também é publicado.

- `status`: `live` (No ar), `opensource` (Open source) ou `wip` (Em desenvolvimento)
- `progress_done`: em projetos com `steps`, quantas etapas já foram concluídas (a seguinte aparece como atual)
- `backlog`: ideias na fila; `"next": true` marca a próxima

## Rodar localmente

```sh
python3 scripts/fetch_macro.py   # baixa os dados do painel macro (site/macro/data.json)
python3 -m http.server -d site 8000
```

e abra http://localhost:8000.

## Deploy

Todo push na `main` publica a pasta `site/` no GitHub Pages pelas actions oficiais (`upload-pages-artifact` e
`deploy-pages`), com o token temporário do próprio workflow; não há secret nem branch `gh-pages`
(workflow em `.github/workflows/deploy-pages.yml`). Em **Settings → Pages**, a origem é **GitHub Actions** e o
domínio personalizado é `www.caioruiz.com`.

O deploy também roda em dias úteis às 08:13 e 19:13 (horário de Brasília) para atualizar o painel macro
(`/macro/`): `scripts/fetch_macro.py` busca as séries no SGS do Banco Central antes de publicar. Se a API
falhar, o deploy falha e o site continua com os dados anteriores.
