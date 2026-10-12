# caioruiz.com

Site pessoal: introdução, projetos, experiência e contatos. Publicado em https://www.caioruiz.com.

HTML e CSS estáticos, sem build. Todo o conteúdo fica em `site/`: português em `site/index.html` e inglês em `site/en/index.html`.

## Rodar localmente

```sh
python3 -m http.server -d site 8000
```

e abra http://localhost:8000.

## Deploy

Todo push na `main` publica a pasta `site/` na branch `gh-pages`
(workflow em `.github/workflows/deploy-pages.yml`). O domínio vem de `site/CNAME`.
