# Como contribuir

Obrigado pelo interesse em ajudar. Este guia mostra como preparar o ambiente, enviar uma mudança e lançar uma versão.

## Relatar um problema ou sugerir algo

Abra uma [issue](https://github.com/TrindadeThiago/screen-share/issues). Para problemas, inclua:

- a versão do app (aparece no aviso de atualização e na página da release que você baixou);
- o que você fez, o que esperava e o que aconteceu;
- o diagnóstico: em **Configurações**, clique em **Copiar diagnóstico** e cole na issue. Ele não inclui códigos de sala nem tokens.

## Preparar o ambiente

Pré-requisitos: Node.js 22 e npm. Para o servidor, Docker. O app só roda de verdade no Windows, porque a captura do áudio do sistema só existe lá.

```sh
npm install
npm test     # API e app (Vitest)
npm run lint
```

Para subir o servidor e abrir o app, siga o [quickstart.md](quickstart.md). Para ver as telas sem servidor, rode `npm run dev -w @screen-share/desktop` e abra `/preview.html` (por exemplo `/preview.html?v=room-live`).

O `.exe` é gerado no Windows com `npm run dist -w @screen-share/desktop`, com o projeto numa pasta do Windows (não dentro do WSL).

## Enviar uma mudança

1. Faça um fork e crie um branch a partir da `main`: `feat/...`, `fix/...`, `docs/...`, `ci/...` ou `chore/...`.
2. Faça a mudança com testes. Mudanças de comportamento precisam de teste; correções, de um teste que falhava antes.
3. Rode `npm run lint`, `npm test` e `npx prettier --check .` antes de abrir o PR.
4. Abra um pull request para a `main` explicando o que muda e por quê, e como você testou.

A `main` é protegida: não aceita push direto nem force push, e o merge exige o check `test` (lint e testes) passando. Na primeira contribuição, o CI só roda depois que um mantenedor aprovar a execução.

### Convenções

- **Commits** em inglês, no formato [Conventional Commits](https://www.conventionalcommits.org/): `feat(desktop): ...`, `fix(api): ...`, `docs: ...`, `ci: ...`.
- **Textos da interface, comentários e documentação** em português.
- **Formatação:** Prettier com a configuração do repositório (`npm run format`).
- **Contratos:** ao mudar a API ou a ponte do Electron (`window.screenShare`), atualize `specs/001-screen-share-app/contracts/`.

## Lançar uma versão

A versão do app é a de `apps/desktop/package.json`. Quando um PR que muda essa versão entra na `main`, o GitHub Actions gera o `.exe` e publica a release `v<versão>`. No PR, o resumo do job `version` diz se o merge vai publicar uma release.

Para lançar, aumente a versão no próprio PR:

```sh
npm version <patch|minor|major> -w @screen-share/desktop --no-git-tag-version
```

- **patch** (1.1.0 → 1.1.1): correções;
- **minor** (1.1.0 → 1.2.0): funcionalidades novas;
- **major** (1.1.0 → 2.0.0): mudanças incompatíveis, como exigir uma API nova no servidor.

PRs que só mexem em documentação, testes ou CI não precisam mudar a versão.

## Licença

Ao contribuir, você concorda que sua contribuição seja distribuída sob a [licença MIT](LICENSE) do projeto.
