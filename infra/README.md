# Infra

Este guia é para uma VM com domínio e HTTPS. Para hospedar no próprio PC com IP público, sem domínio, use `docker-compose.home.yml` e siga a seção 7 do `quickstart.md` na raiz.

1. Copie `.env.example` para `.env` e preencha `DOMAIN`, chaves do LiveKit.
2. Aponte `DOMAIN` e `live.DOMAIN` (DNS A) para a VM.
3. Abra no firewall: 80/tcp, 443/tcp, 7881/tcp, 3478/udp, 50000-50200/udp.
4. `docker compose up -d --build`
5. A página em `infra/site` aponta para o `.exe` da última release no GitHub; não há arquivo para copiar.

## TURN/TLS (opcional)

Por padrão o TURN roda só em UDP (3478) e redes restritas usam o fallback TCP na 7881. Para redes
que só liberam 443, habilite TURN/TLS em `livekit.yaml`: crie um registro `turn.DOMAIN`, obtenha um
certificado para ele e adicione ao bloco `turn`:

```yaml
domain: turn.SEU-DOMINIO
tls_port: 5349
cert_file: /etc/livekit/turn.crt
key_file: /etc/livekit/turn.key
```

Monte os arquivos no contêiner, publique `5349:5349/tcp` no compose e abra a porta no firewall. Como
o Caddy já usa a 443, expor o TURN nela exige um proxy de camada 4 por SNI na frente dos dois.

## Quem pode criar salas

Sem `ROOM_CREATION_KEY`, qualquer pessoa que alcance o servidor cria salas e usa sua banda. Defina a
chave no `.env` e passe-a só a quem hospeda salas (`serverKey` no `config.json` do app). Entrar numa
sala continua exigindo apenas o código.

## Monitoramento

O LiveKit expõe métricas Prometheus na porta 6789 (interna). Aponte um Prometheus para `livekit:6789`
e observe `livekit_room_total`, `livekit_participant_total`, e tráfego de rede. Alerte quando a banda
de saída da VM passar de ~80% do contratado.

## Backup

`infra/backup.sh` copia o SQLite da API e a configuração.
