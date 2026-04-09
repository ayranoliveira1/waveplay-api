# WavePlay API — Checklist de Seguranca

> Catalogo completo de vulnerabilidades para consulta durante a implementacao de cada task.
> Para cada vulnerabilidade: descricao, como prevenir no contexto WavePlay (NestJS + Prisma + Redis), e severidade.

---

## 1. Injection (Injecao)

| # | Vulnerabilidade | Descricao | Prevencao no WavePlay | Severidade |
|---|-----------------|-----------|----------------------|------------|
| 1.1 | **SQL Injection** (classica, blind, out-of-band) | Input do usuario inserido diretamente em queries SQL permite executar comandos arbitrarios | Prisma usa parameterized queries por padrao. Nunca usar `$queryRawUnsafe()` com input do usuario. Se usar `$queryRaw`, sempre usar template literals do Prisma (`Prisma.sql`) | Critica |
| 1.2 | **NoSQL Injection** | Operadores de query ($gt, $ne) injetados em filtros NoSQL | Nao aplicavel (usamos PostgreSQL), mas se usar Redis: nunca concatenar input em comandos Redis | Alta |
| 1.3 | **Command Injection** (OS command) | Input do usuario passado para `exec()`, `spawn()`, `execSync()` executa comandos no servidor | Nunca usar child_process com input do usuario. Se necessario, usar `execFile()` com argumentos em array, nunca concatenar strings | Critica |
| 1.4 | **LDAP Injection** | Caracteres especiais em filtros LDAP alteram a query | Nao aplicavel (nao usamos LDAP) | N/A |
| 1.5 | **XPath Injection** | Input malicioso em queries XPath | Nao aplicavel (nao usamos XML/XPath) | N/A |
| 1.6 | **CRLF Injection** (Header Injection) | Caracteres \r\n injetados em headers HTTP permitem manipular resposta | Helmet ja protege. NestJS sanitiza headers por padrao. Nunca inserir input do usuario diretamente em headers de resposta | Alta |
| 1.7 | **Log Injection** (Log Forging) | Input do usuario inserido em logs pode falsificar entradas de log ou injetar caracteres de controle | Sanitizar input antes de logar: remover \n, \r, \t. Usar structured logging (JSON). Nunca logar input do usuario diretamente em formato texto | Media |
| 1.8 | **Template Injection** (SSTI) | Input do usuario processado por engine de template executa codigo no servidor | Nao usamos template engine no backend (API pura). Se usar email templates: nunca interpolar input do usuario no template | Critica |
| 1.9 | **Code Injection** | Input do usuario passado para `eval()`, `new Function()`, `vm.runInContext()` | Nunca usar eval() ou Function constructor com input do usuario. ESLint rule: no-eval | Critica |
| 1.10 | **Expression Language Injection** | Input injetado em expression languages (EL, SpEL) | Nao aplicavel (Node.js nao usa EL nativamente) | N/A |
| 1.11 | **HTTP Header Injection** | Manipulacao de headers via input do usuario | NestJS sanitiza headers automaticamente. Validar e sanitizar qualquer valor usado em headers customizados | Media |
| 1.12 | **Email Header Injection** | Caracteres especiais em campos de email permitem adicionar headers (CC, BCC) | Se implementar envio de email (forgot-password): validar formato de email com Zod, usar biblioteca de email que sanitiza headers (nodemailer) | Alta |

---

## 2. Broken Authentication

| # | Vulnerabilidade | Descricao | Prevencao no WavePlay | Severidade |
|---|-----------------|-----------|----------------------|------------|
| 2.1 | **Brute Force** | Tentativas massivas de login para adivinhar credenciais | Account lockout apos 5 falhas (Redis TTL 30min). Rate limiting no ThrottlerModule (login, refresh, forgot-password). IP-based + user-based throttling | Critica |
| 2.2 | **Credential Stuffing** | Uso de credenciais vazadas de outros servicos | Account lockout + rate limiting. Considerar deteccao de login de novo dispositivo/IP (futuro) | Alta |
| 2.3 | **Password Spraying** | Testar senhas comuns contra muitos usuarios | Rate limiting global por IP. Account lockout por usuario | Alta |
| 2.4 | **Session Fixation** | Atacante fixa um session ID antes do login da vitima | Nao usamos sessions (JWT stateless). Refresh tokens sao gerados no servidor, nunca aceitar token do cliente como novo | Alta |
| 2.5 | **Session Hijacking** | Roubo de token de sessao via XSS, MITM, etc | Access token em memoria (web), secure-store (mobile). Refresh token em httpOnly cookie (web). HTTPS obrigatorio. Short TTL no access token (15min) | Critica |
| 2.6 | **Weak Password Policy** | Senhas fracas permitidas | Validar no RegisterUseCase: minimo 8 caracteres, pelo menos 1 maiuscula, 1 minuscula, 1 numero. Zod schema no controller | Media |
| 2.7 | **Default Credentials** | Credenciais padrao nao alteradas em servicos | Nao criar usuarios admin default no seed. Redis e PostgreSQL devem ter senha configurada no .env | Alta |
| 2.8 | **Missing MFA** | Falta de autenticacao multi-fator | Nao implementado na v1. Documentar como melhoria futura | Media |
| 2.9 | **Insecure "Remember Me"** | Token de "lembrar" persistido de forma insegura | Refresh token com TTL 48h. Rotacao obrigatoria a cada uso. Stored em httpOnly cookie (web) ou secure-store (mobile) | Media |
| 2.10 | **Password in URL** | Senha enviada via query string (fica em logs, historico) | Todas as rotas de auth usam POST com body. Nunca aceitar credenciais via GET/query params | Alta |
| 2.11 | **Insecure Password Recovery** | Fluxo de reset de senha com falhas | Token com SHA-256 hash no banco, TTL 15min, single-use (usedAt). Revogar todas as familias de refresh token no reset. Endpoint retorna 200 mesmo se email nao existe (anti-enumeration) | Alta |
| 2.12 | **Account Enumeration** (timing + response) | Diferenca nas respostas revela se email existe | Register: retorna erro generico. Login: mensagem "credenciais invalidas" (nao "email nao encontrado"). Forgot-password: sempre 200. Usar timing-safe comparison | Media |
| 2.13 | **Account Lockout Bypass** | Burlar o mecanismo de lockout | Lockout via Redis com chave por email. TTL automatico de 30min. Nao resetar contador em login parcialmente bem-sucedido. Resetar apenas em login com sucesso total | Alta |
| 2.14 | **JWT — Algorithm None** | Aceitar tokens sem assinatura (alg: "none") | Configurar NestJS JwtModule com `algorithms: ['RS256']` ou `['HS256']` explicitamente. Nunca aceitar "none" | Critica |
| 2.15 | **JWT — Weak Signing Secret** | Secret previsivel permite forjar tokens | Usar chave com pelo menos 256 bits de entropia. Gerar com `openssl rand -base64 64`. Armazenar no .env, nunca hardcoded | Critica |
| 2.16 | **JWT — Missing Expiration** | Token sem `exp` claim e valido para sempre | Sempre configurar `expiresIn` no JwtModule. Access: 15min, Refresh: 48h | Alta |
| 2.17 | **JWT — Key Confusion** (RS256 para HS256) | Atacante muda algoritmo para HS256 e assina com a chave publica | Especificar algoritmo fixo no JwtModule. Rejeitar tokens com algoritmo diferente do configurado | Critica |
| 2.18 | **JWT — Token Replay** | Reutilizar access token apos logout | Access token e stateless (15min TTL curto). Refresh token: rotacao obrigatoria, tokens antigos invalidados. Theft detection revoga toda a familia | Alta |
| 2.19 | **JWT — Insufficient Claims** | Nao validar claims como iss, aud, sub | Validar `sub` (userId) em todo token. Considerar adicionar `iss` e `aud` no futuro | Media |

---

## 3. Broken Access Control

| # | Vulnerabilidade | Descricao | Prevencao no WavePlay | Severidade |
|---|-----------------|-----------|----------------------|------------|
| 3.1 | **IDOR** (Insecure Direct Object Reference) | Acessar recursos de outros usuarios alterando IDs na URL | Ownership validation em TODOS os use cases: `profile.userId === auth.userId`. Nunca confiar no ID da URL sem verificar ownership | Critica |
| 3.2 | **BOLA** (Broken Object Level Authorization) — OWASP API1 | Mesmo que IDOR mas no contexto de APIs | Cada use case que recebe profileId, streamId, etc. deve verificar que o recurso pertence ao usuario autenticado | Critica |
| 3.3 | **BFLA** (Broken Function Level Authorization) — OWASP API5 | Usuario acessa funcoes administrativas | `AdminGuard` checa `req.user.role === 'admin'` nas rotas decoradas com `@Admin()`. Retorna 403 para qualquer token de role `user`. Ver secao 19 (Admin BC) | Alta |
| 3.4 | **Vertical Privilege Escalation** | Usuario regular executa acoes de admin | AuthGuard em todas as rotas protegidas. Nao expor endpoints de gerenciamento de planos para usuarios comuns | Critica |
| 3.5 | **Horizontal Privilege Escalation** | Usuario A acessa dados do usuario B | Ownership validation: `profile.userId === auth.userId` em Profile, Library, Playback, Streams. Nunca retornar dados de outros usuarios | Critica |
| 3.6 | **Missing Function Level Access Control** | Endpoints sem protecao de autenticacao | AuthGuard global no AppModule. Usar @Public() decorator apenas nas rotas que realmente devem ser publicas (register, login, forgot-password) | Alta |
| 3.7 | **Directory Traversal / Path Traversal** | Input como `../../etc/passwd` acessa arquivos do sistema | Nao servimos arquivos estaticos. Se implementar upload: validar filename, usar UUID como nome, nunca usar input do usuario em caminhos de arquivo | Alta |
| 3.8 | **Forced Browsing** | Acessar endpoints nao linkados na UI (ex: /admin, /debug) | Nao expor rotas de debug. Swagger apenas em desenvolvimento. AuthGuard global protege tudo por padrao | Media |
| 3.9 | **HTTP Method Override** | Usar PUT/DELETE em endpoint que so aceita GET | NestJS decorators (@Get, @Post, etc.) restringem metodos automaticamente. Desabilitar method override no Express | Media |
| 3.10 | **Metadata Manipulation** | Alterar userId, role, planId no body da request | Nunca confiar em userId do body. Sempre extrair do JWT (`@GetUser()` decorator). planId e role vem do banco, nao do request | Critica |
| 3.11 | **Broken Object Property Level Auth** — OWASP API3 | Usuario modifica propriedades que nao deveria (ex: alterar plan, role via update profile) | DTOs com campos explicitos (Zod schema). Nunca fazer spread do body no update. Listar explicitamente quais campos sao atualizaveis | Alta |

---

## 4. Sensitive Data Exposure / Cryptographic Failures

| # | Vulnerabilidade | Descricao | Prevencao no WavePlay | Severidade |
|---|-----------------|-----------|----------------------|------------|
| 4.1 | **Dados em transito sem TLS** | Dados interceptados entre cliente e servidor | HTTPS obrigatorio em producao. HSTS header via Helmet. Redirect HTTP para HTTPS no reverse proxy | Critica |
| 4.2 | **Certificados TLS invalidos** | Certificados expirados ou self-signed em producao | Usar certificados validos (Let's Encrypt). Monitorar expiracao. Nunca desabilitar verificacao de certificado em producao | Alta |
| 4.3 | **Hashing fraco de senhas** | MD5, SHA1, bcrypt com cost baixo | Argon2id com memoryCost=65536, timeCost=3, parallelism=1. Nunca MD5/SHA1 para senhas | Critica |
| 4.4 | **Dados sensiveis em logs** | Senhas, tokens, dados pessoais logados | Nunca logar: passwords, tokens, refresh tokens, dados de cartao. Mascarar email em logs (a***@email.com). Structured logging | Alta |
| 4.5 | **Dados sensiveis em erros** | Stack traces, queries SQL, caminhos internos nas respostas de erro | AllExceptionsFilter: em producao retornar apenas message e statusCode. Nunca retornar stack trace, query SQL, ou caminhos do filesystem | Alta |
| 4.6 | **Dados sensiveis em URLs** | Tokens, senhas em query strings (ficam em logs de servidor, historico) | Nunca enviar tokens ou credenciais via GET params. Reset token no body (POST), nunca na URL | Media |
| 4.7 | **Dados sensiveis em cache** | Respostas com dados sensiveis cacheadas pelo browser | Headers Cache-Control: no-store em respostas com dados sensiveis. Helmet configura headers base | Media |
| 4.8 | **Secrets hardcoded** | Chaves de API, senhas, JWT secrets no codigo fonte | Todas as secrets no .env. .env no .gitignore. EnvService com Zod validation para garantir que estao configuradas. Nunca commitar .env | Critica |
| 4.9 | **Secrets em repositorio git** | .env, chaves privadas commitados acidentalmente | .gitignore com .env, *.pem, *.key. git-secrets ou pre-commit hook para detectar secrets. Se vazar: rotacionar imediatamente | Critica |
| 4.10 | **Chaves de API no frontend** | TMDB_ACCESS_TOKEN ou JWT_SECRET expostos no client | TMDB_ACCESS_TOKEN apenas no backend (CatalogModule). JWT_SECRET nunca exposto. Frontend apenas recebe tokens assinados | Alta |
| 4.11 | **Falta de encryption at rest** | Dados sensiveis em texto plano no banco | Senhas em Argon2id hash. Refresh tokens em SHA-256 hash. Password reset tokens em SHA-256 hash. Dados pessoais: avaliar criptografia de coluna se necessario | Media |
| 4.12 | **Algoritmos criptograficos fracos** | MD5, SHA1, DES, RC4 para qualquer fim | Hashing: Argon2id (senhas), SHA-256 (tokens). Encryption: AES-256 se necessario. Nunca MD5/SHA1 para seguranca | Alta |
| 4.13 | **Random inseguro** | `Math.random()` para gerar tokens ou IDs | Usar `crypto.randomBytes()` ou `crypto.randomUUID()` para tokens. uuidv7 para IDs de entidade. Nunca Math.random() para seguranca | Alta |
| 4.14 | **Missing/weak HSTS** | Falta de HTTP Strict Transport Security | Helmet configura HSTS automaticamente. Verificar maxAge adequado (1 ano = 31536000) | Media |

---

## 5. Security Misconfiguration

| # | Vulnerabilidade | Descricao | Prevencao no WavePlay | Severidade |
|---|-----------------|-----------|----------------------|------------|
| 5.1 | **Headers de seguranca ausentes** | Falta de CSP, X-Frame-Options, X-Content-Type-Options | Helmet no main.ts configura todos os headers necessarios: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, CSP | Alta |
| 5.2 | **CORS permissivo** | `origin: *` com `credentials: true` permite qualquer site | CORS com lista explicita de origens permitidas. credentials: true. X-Platform em allowedHeaders. Nunca origin: * com credentials | Critica |
| 5.3 | **Stack traces em producao** | Erros internos expondo codigo, caminhos, queries | AllExceptionsFilter: verificar NODE_ENV. Em producao: message generica + statusCode. Em dev: incluir stack | Alta |
| 5.4 | **Directory listing** | Listar conteudo de diretorios via HTTP | NestJS nao serve arquivos estaticos por padrao. Nao habilitar ServeStaticModule sem necessidade | Baixa |
| 5.5 | **Portas/servicos expostos** | PostgreSQL, Redis acessiveis externamente | docker-compose: bind PostgreSQL e Redis apenas em 127.0.0.1. Em producao: firewall rules, VPC privada. Nunca expor banco publicamente | Critica |
| 5.6 | **Default accounts** | Usuarios admin com senha padrao | Seed script nao deve criar usuarios admin com senhas default. Apenas planos (dados de referencia) | Alta |
| 5.7 | **Permissoes excessivas no banco** | Usuario da aplicacao com permissao de DROP, CREATE ROLE | Criar usuario PostgreSQL especifico para a app com apenas SELECT, INSERT, UPDATE, DELETE. Migrations rodam com usuario separado com mais permissoes | Media |
| 5.8 | **Cookies inseguros** | Falta de Secure, HttpOnly, SameSite em cookies | Refresh token cookie: httpOnly=true, secure=true (producao), sameSite='strict', path='/auth' (cobre register, login e refresh que setam/leem o cookie). Nunca enviar cookie sem flags de seguranca | Alta |
| 5.9 | **Versao de software em headers** | Server: Express, X-Powered-By: Express | Helmet remove X-Powered-By automaticamente. Verificar que nao ha headers revelando versoes | Baixa |
| 5.10 | **Rate limiting ausente** | Sem limite de requests permite abuso | ThrottlerModule global configurado. Limites especificos em rotas criticas: login (5/min), refresh (10/min), forgot-password (3/min) | Alta |
| 5.11 | **Helmet ausente ou mal configurado** | Falta de middleware de seguranca basico | `app.use(helmet())` no main.ts. Verificar configuracao: HSTS, noSniff, frameguard, xssFilter | Alta |
| 5.12 | **Redis/banco sem senha** | Acesso sem autenticacao | Redis: configurar requirepass. PostgreSQL: sempre com password. Credenciais no .env | Critica |
| 5.13 | **.env commitado** | Variaveis de ambiente sensiveis no repositorio | .env no .gitignore. .env.example com valores placeholder (sem secrets reais). Verificar com git log se ja foi commitado | Critica |

---

## 6. Cross-Site Scripting (XSS)

| # | Vulnerabilidade | Descricao | Prevencao no WavePlay | Severidade |
|---|-----------------|-----------|----------------------|------------|
| 6.1 | **Stored XSS** | Dados maliciosos salvos no banco executam script quando renderizados | API retorna JSON (nao HTML). Mesmo assim: sanitizar input que sera armazenado (nomes de perfil, etc.). Frontend deve fazer output encoding | Alta |
| 6.2 | **Reflected XSS** | Input refletido na resposta sem encoding | API retorna JSON com Content-Type: application/json. Helmet configura X-Content-Type-Options: nosniff para prevenir MIME sniffing | Media |
| 6.3 | **DOM-based XSS** | Manipulacao de DOM no cliente via dados da API | Responsabilidade do frontend. API deve retornar dados limpos. Presenter layer nunca deve incluir HTML | Media |
| 6.4 | **Mutation XSS** (mXSS) | HTML valido que muta em malicioso apos parsing | Nao aplicavel em API pura JSON. Relevante se futuramente retornarmos HTML | Baixa |

---

## 7. Cross-Site Request Forgery (CSRF)

| # | Vulnerabilidade | Descricao | Prevencao no WavePlay | Severidade |
|---|-----------------|-----------|----------------------|------------|
| 7.1 | **CSRF em endpoints de mutacao** | Site malicioso envia requests autenticados usando cookies do usuario | Refresh token cookie com SameSite=strict. CORS restritivo. Access token em header Authorization (nao enviado automaticamente) | Alta |
| 7.2 | **Missing CSRF tokens** | Formularios sem protecao anti-CSRF | API stateless com JWT no header. Nao usamos sessions/formularios. SameSite cookie e suficiente para refresh token | Media |
| 7.3 | **CSRF via JSON** | Explorar CORS permissivo para enviar JSON cross-origin | CORS com origins explicitas. Nunca origin: *. Preflight check para Content-Type: application/json | Media |
| 7.4 | **Cookie auth sem SameSite** | Cookies enviados automaticamente em requests cross-site | SameSite=strict no refresh token cookie. Secure=true em producao | Alta |

---

## 8. Server-Side Request Forgery (SSRF) — OWASP API7

| # | Vulnerabilidade | Descricao | Prevencao no WavePlay | Severidade |
|---|-----------------|-----------|----------------------|------------|
| 8.1 | **SSRF para servicos internos** | Atacante faz servidor acessar metadata AWS, Redis, banco interno | CatalogModule faz requests apenas para TMDB_BASE_URL (URL fixa do .env). Nunca permitir URL dinamica vinda do usuario | Critica |
| 8.2 | **SSRF via URL do usuario** | Input de URL usado para fazer request server-side | Nao aceitamos URLs do usuario. TMDB ID e numerico (validar com Zod: z.number() ou z.string().regex(/^\d+$/)) | Alta |
| 8.3 | **SSRF via redirect** | Servidor segue redirects para URLs internas | Configurar Axios com maxRedirects: 0 ou validar URL de destino antes de seguir redirect | Media |
| 8.4 | **DNS Rebinding** | DNS resolve para IP interno apos validacao | Validar IP de destino apos resolucao DNS. Para TMDB: URL fixa, risco baixo | Media |
| 8.5 | **Blind SSRF** | Request feito mas resposta nao retornada ao atacante | Mesmo sem retorno, o request interno e perigoso. Mesmas prevencoes: URLs fixas, validacao de input | Alta |

---

## 9. Insecure Deserialization

| # | Vulnerabilidade | Descricao | Prevencao no WavePlay | Severidade |
|---|-----------------|-----------|----------------------|------------|
| 9.1 | **RCE via deserialization** | Objeto malicioso desserializado executa codigo | NestJS usa JSON.parse (seguro por padrao). Nunca usar `serialize`/`deserialize` de bibliotecas inseguras. Nunca desserializar formatos binarios de input do usuario | Critica |
| 9.2 | **Object Injection** | Propriedades inesperadas injetadas via JSON | Zod schemas validam estrutura exata do input. Nunca fazer spread de body diretamente em entidades ou queries | Alta |
| 9.3 | **Prototype Pollution via merge** | `__proto__` ou `constructor` em JSON polui prototipos globais | Nunca usar deep merge de objetos de input do usuario sem sanitizacao. Usar Object.create(null) ou bibliotecas seguras. Zod strip() remove campos desconhecidos | Critica |
| 9.4 | **Type Confusion** | Tipo inesperado causa comportamento diferente | Zod valida tipos estritamente. Usar z.string(), z.number(), etc. Nunca confiar em typeof para validacao de seguranca | Media |

---

## 10. Vulnerable and Outdated Components

| # | Vulnerabilidade | Descricao | Prevencao no WavePlay | Severidade |
|---|-----------------|-----------|----------------------|------------|
| 10.1 | **Dependencias com CVEs** | Bibliotecas com vulnerabilidades conhecidas | Rodar `pnpm audit` regularmente. Configurar Dependabot ou Renovate. Atualizar dependencias criticas imediatamente | Alta |
| 10.2 | **Supply Chain Attacks** | Pacotes maliciosos com nomes similares (typosquatting) | Verificar nomes de pacotes antes de instalar. Usar lockfile (pnpm-lock.yaml). Revisar dependencias novas | Alta |
| 10.3 | **Lockfile Manipulation** | Lockfile alterado para apontar para pacotes maliciosos | Commitar pnpm-lock.yaml. Revisar changes no lockfile em PRs. Usar `pnpm install --frozen-lockfile` em CI | Media |
| 10.4 | **Falta de audit regular** | Vulnerabilidades acumulam sem deteccao | Incluir `pnpm audit` no CI pipeline. Bloquear deploy se audit encontrar criticos | Media |
| 10.5 | **Dependencias abandonadas** | Bibliotecas sem manutencao com bugs nao corrigidos | Preferir pacotes com manutencao ativa e comunidade. Verificar ultimo commit e issues abertas antes de adotar | Baixa |

---

## 11. Insufficient Logging & Monitoring

| # | Vulnerabilidade | Descricao | Prevencao no WavePlay | Severidade |
|---|-----------------|-----------|----------------------|------------|
| 11.1 | **Eventos de seguranca nao logados** | Login falho, access denied, token invalido sem registro | Logar: login falho (email + IP), account lockout, token revogado, refresh theft detection, password reset request | Alta |
| 11.2 | **Logs insuficientes para forense** | Falta de contexto nos logs para investigar incidentes | Incluir: timestamp, userId, IP, user-agent, endpoint, resultado. Structured logging em JSON | Media |
| 11.3 | **Logs nao protegidos** | Logs podem ser alterados ou deletados | Em producao: enviar logs para servico externo (CloudWatch, Datadog). Logs locais com permissoes restritas | Media |
| 11.4 | **Falta de alertas** | Eventos criticos passam despercebidos | Configurar alertas para: multiplos lockouts, taxa alta de 401/403, picos de refresh token usage | Media |
| 11.5 | **Falta de audit trail** | Acoes sensiveis sem registro para auditoria | Tabela AuditLog conforme business-rules.md secao 11. Registrar: login, logout, password change, profile CRUD | Alta |
| 11.6 | **PII em logs** | Dados pessoais em logs violam LGPD/GDPR | Nunca logar: senha, CPF completo, numero de cartao. Mascarar email. Logar apenas IDs internos | Alta |

---

## 12. Business Logic Vulnerabilities

| # | Vulnerabilidade | Descricao | Prevencao no WavePlay | Severidade |
|---|-----------------|-----------|----------------------|------------|
| 12.1 | **Race Condition** (TOCTOU) | Check e acao nao sao atomicos: dois requests simultaneos burlam limite | Usar transacoes Prisma (`$transaction`). Para streams: upsert atomico com @@unique constraint. Para perfis: verificar count dentro da transacao. Ping usa Redis ZADD (atomico). Start mantem $transaction no PostgreSQL para count + upsert | Alta |
| 12.2 | **Bypass de limites de negocio** | Criar mais perfis/streams que o plano permite | Verificar limite DENTRO da transacao de criacao. Nunca verificar count separadamente e depois criar | Alta |
| 12.3 | **Replay Attacks** | Reenviar request valido para duplicar acao | Refresh token rotation: cada token so funciona uma vez. Para operacoes criticas: idempotency keys (futuro) | Media |
| 12.4 | **Parameter Tampering** | Alterar planId, preco, role no body da request | Nunca aceitar planId de upgrade via body (futuro). userId sempre do JWT. Zod schemas com campos exatos | Alta |
| 12.5 | **Workflow Bypass** | Pular etapas obrigatorias de um fluxo | Validar pre-condicoes em cada use case. Ex: nao pode criar perfil sem estar autenticado, nao pode assistir sem ter perfil selecionado | Media |
| 12.6 | **Abuse of Functionality** | Funcionalidade legitima usada em escala maliciosa | Rate limiting por usuario e IP. Limites de negocio nos use cases (max 50 historico, max 5 perfis) | Media |
| 12.7 | **Insufficient Anti-automation** | Bots automatizando acoes (registro em massa, scraping) | ThrottlerModule com limites por IP. Considerar CAPTCHA para registro (futuro) | Media |
| 12.8 | **Negative Value Manipulation** | Valores negativos onde so positivos sao esperados | Zod: z.number().min(0) para progressSeconds, durationSeconds, season, episode. Validar em todos os DTOs | Media |

---

## 13. Denial of Service (DoS) — Application Level

| # | Vulnerabilidade | Descricao | Prevencao no WavePlay | Severidade |
|---|-----------------|-----------|----------------------|------------|
| 13.1 | **ReDoS** (Regular Expression DoS) | Regex com backtracking catastrofico trava o event loop | Nunca usar regex complexa com input do usuario. Usar Zod para validacao (nao regex manual). Se usar regex: testar com ferramentas anti-ReDoS | Alta |
| 13.2 | **Resource Exhaustion** | Memoria, CPU, conexoes esgotadas | Limitar tamanho de body (NestJS default ou configurar). Connection pooling no Prisma. Limites no Redis (maxmemory) | Alta |
| 13.3 | **Algorithmic Complexity** | Input que causa O(n^2) ou pior em algoritmos | Cuidado com sort/filter em listas grandes do usuario. Usar paginacao. Limitar resultados (LIMIT no SQL) | Media |
| 13.4 | **Large Payload** | Body, headers ou query string enormes | Configurar body parser limit no NestJS (ex: 1MB). Helmet limita headers. Validar tamanho de strings no Zod (z.string().max()) | Alta |
| 13.5 | **Slowloris** | Conexoes HTTP lentas esgotam slots do servidor | Configurar timeout no Express/NestJS. Em producao: reverse proxy (Nginx) com timeouts adequados | Media |
| 13.6 | **Connection Pool Exhaustion** | Todas as conexoes do pool ocupadas | Prisma connection pool com tamanho adequado. Timeout em queries longas. Monitorar pool usage. Ping de streams usa Redis (elimina ~100 queries/s do pool do Prisma) | Alta |
| 13.7 | **Infinite Loops via Input** | Input que causa loop infinito no servidor | Validar input antes de processar. Timeout em operacoes. Nao iterar sobre listas controladas pelo usuario sem limite | Media |
| 13.8 | **Uncontrolled Resource Consumption** — OWASP API4 | API sem limites permite consumo excessivo | Rate limiting global + per-route. Paginacao obrigatoria em listagens. Limites de tamanho em todos os inputs | Alta |
| 13.9 | **Decompression Bomb** | Arquivo comprimido que expande para tamanho enorme | Nao aceitamos upload de arquivos na v1. Se implementar: limitar tamanho descomprimido | Media |

---

## 14. Mass Assignment / Excessive Data Exposure

| # | Vulnerabilidade | Descricao | Prevencao no WavePlay | Severidade |
|---|-----------------|-----------|----------------------|------------|
| 14.1 | **Mass Assignment** | Campos extras no body (role, isAdmin) aceitos pelo servidor | Zod schemas com campos explicitos (nunca z.object().passthrough()). Usar z.object().strict() ou listar campos exatos. Nunca spread body em entity/update | Critica |
| 14.2 | **Excessive Data Exposure** | API retorna mais dados que o necessario | Presenters definem exatamente quais campos sao retornados. Nunca retornar entity inteira. UserPresenter nunca retorna password hash. Response 409 de streams expoe apenas: streamId, profileName, title, type, startedAt. Nunca expor userId, profileId raw, IP ou device info | Alta |
| 14.3 | **Broken Object Property Level Auth** — OWASP API3 | Usuario lê ou modifica propriedades que nao deveria | DTOs separados para create e update. Update DTO so aceita campos editaveis. Presenter filtra campos visiveis | Alta |

---

## 15. Node.js / NestJS Specific

| # | Vulnerabilidade | Descricao | Prevencao no WavePlay | Severidade |
|---|-----------------|-----------|----------------------|------------|
| 15.1 | **Prototype Pollution** | `__proto__` ou `constructor.prototype` em input polui Object.prototype | Zod rejeita `__proto__` por padrao. Nunca usar lodash.merge ou deep-extend com input do usuario. Usar Object.create(null) para dicionarios | Critica |
| 15.2 | **Event Loop Blocking** | Operacoes sincronas pesadas bloqueiam todo o servidor | Argon2 usa worker threads (async por padrao). Nunca usar *Sync() em runtime. Offload operacoes pesadas para worker threads | Alta |
| 15.3 | **Unhandled Promise Rejection** | Promise rejeitada sem catch crasha o processo | NestJS exception filters capturam erros em controllers. Adicionar process.on('unhandledRejection') no main.ts. Sempre usar try/catch em async | Alta |
| 15.4 | **Memory Leaks** | Event listeners, closures, caches sem limite crescem indefinidamente | Remover event listeners no onModuleDestroy. Redis cache com TTL (nunca sem expiracao). Monitorar heap em producao | Media |
| 15.5 | **Path Traversal via path.join** | `path.join(base, userInput)` com `../` escapa do diretorio | Nao servimos arquivos. Se implementar: usar path.resolve + verificar que resultado comeca com base dir | Alta |
| 15.6 | **Timing Attacks** | Comparacao de strings com `===` vaza informacao pelo tempo de resposta | Usar `crypto.timingSafeEqual()` para comparar tokens e hashes. Especialmente em: refresh token validation, password reset token | Media |
| 15.7 | **Child Process Injection** | exec/spawn com input concatenado executa comandos | Nunca usar child_process com input do usuario. Se necessario: execFile com args em array | Critica |
| 15.8 | **Buffer.allocUnsafe** | Buffer nao inicializado pode conter dados de memoria anteriores | Sempre usar Buffer.alloc() (inicializado com zeros). Nunca Buffer.allocUnsafe() em contexto de seguranca | Media |
| 15.9 | **RegExp com input do usuario** | `new RegExp(userInput)` permite ReDoS e injection | Nunca usar new RegExp() com input do usuario. Se necessario: escapar caracteres especiais com escapeRegExp | Alta |
| 15.10 | **process.env Mutation** | Modificar process.env em runtime causa efeitos colaterais globais | EnvService com Zod valida env no startup. Nunca modificar process.env em runtime. Tratar como imutavel | Baixa |
| 15.11 | **Missing Guard em NestJS** | Controller ou rota sem AuthGuard expoe dados | AuthGuard global no AppModule (APP_GUARD). @Public() decorator explicito para rotas publicas. Testar que rotas protegidas retornam 401 sem token | Critica |
| 15.12 | **Pipe Validation Bypass** | Input nao validado chega no use case | ZodValidationPipe global. Cada controller define Zod schema. Nunca confiar que o input ja esta validado sem pipe | Alta |
| 15.13 | **Global vs Route Guards** | Guard global esquecido ou sobrescrito localmente | Configurar AuthGuard como APP_GUARD no modulo global. Verificar que @Public() so esta onde deve | Alta |

---

## 16. API-Specific

| # | Vulnerabilidade | Descricao | Prevencao no WavePlay | Severidade |
|---|-----------------|-----------|----------------------|------------|
| 16.1 | **API Versioning inseguro** | Versao antiga da API com falhas ainda acessivel | v1 unica na primeira versao. Quando versionar: deprecar e remover versoes antigas com prazo | Media |
| 16.2 | **Missing Input Validation** | Query params, path params, headers nao validados | Zod schemas para body, query e params. Validar :id como UUID com z.string().uuid(). Validar query params (page, limit) como numeros positivos | Alta |
| 16.3 | **HTTP Verb Tampering** | GET com side effects ou POST para leitura | Seguir semantica REST: GET = leitura, POST = criacao, PUT = atualizacao, DELETE = remocao. Nunca mutar estado em GET | Media |
| 16.4 | **Content-Type Confusion** | Enviar XML/form-data onde so JSON e esperado | NestJS aceita JSON por padrao. Rejeitar Content-Types inesperados. Nao habilitar parsers adicionais sem necessidade | Media |
| 16.5 | **API Key em logs/URLs** | TMDB_ACCESS_TOKEN vazado em logs ou URLs | TMDB token no header Authorization (Bearer), nunca em query string. Nao logar headers de autorizacao | Alta |
| 16.6 | **Missing Pagination** | Listagem sem limite retorna todos os registros | Sempre paginar: limit padrao (20), max (100). Zod: z.number().min(1).max(100).default(20). Historico: max 50 itens | Media |
| 16.7 | **Batch Endpoint Abuse** | Endpoint de batch processando milhares de itens | Nao temos batch endpoints. Se implementar: limitar tamanho do array | Media |
| 16.8 | **Sensitive Business Flows** — OWASP API6 | Fluxos criticos (registro, checkout) sem protecao contra automacao | Rate limiting em register, login, forgot-password. Considerar CAPTCHA para registro (futuro) | Media |
| 16.9 | **Improper Inventory Management** — OWASP API9 | Endpoints nao documentados, versoes antigas ativas | Manter docs/api-contracts.md atualizado. Nao criar endpoints "temporarios" sem documentar. Swagger apenas em dev | Media |
| 16.10 | **Unsafe API Consumption** — OWASP API10 | Confiar cegamente em APIs externas (TMDB) | Validar resposta do TMDB antes de retornar. Nao confiar que a estrutura e sempre a mesma. Timeout e retry com limites. Nao propagar erros internos do TMDB | Alta |

---

## 17. Data Validation & Sanitization

| # | Vulnerabilidade | Descricao | Prevencao no WavePlay | Severidade |
|---|-----------------|-----------|----------------------|------------|
| 17.1 | **Missing Input Validation** | Tipo, formato, tamanho, range nao verificados | Zod em todos os controllers: z.string().min(1).max(255), z.number().int().min(0), z.enum() para tipos fixos | Alta |
| 17.2 | **Missing Output Encoding** | Dados retornados sem encoding adequado | API JSON: Content-Type: application/json. Presenter layer formata output. Frontend responsavel por encoding HTML | Media |
| 17.3 | **Unicode Normalization** | Caracteres unicode visualmente identicos mas diferentes (homoglyph) | Normalizar strings de input (NFC) antes de comparacao e armazenamento. Especialmente em: nomes de perfil, busca | Baixa |
| 17.4 | **Null Byte Injection** | \0 em strings trunca processamento em linguagens C | Node.js geralmente seguro. Mas: sanitizar null bytes em input que ira para filesystem ou processos externos | Baixa |
| 17.5 | **Integer Overflow** | Valores numericos excedendo limites causam wrap-around | JavaScript usa Number.MAX_SAFE_INTEGER. Zod: z.number().max(Number.MAX_SAFE_INTEGER). Para progress: z.number().min(0).max(86400) | Baixa |
| 17.6 | **Type Coercion** | JavaScript loose equality (==) causa comparacoes erradas | Sempre usar === (strict equality). ESLint rule: eqeqeq. TypeScript strict mode ajuda a prevenir | Media |
| 17.7 | **URL Validation Bypass** | Esquemas perigosos (javascript:, data:, file:) passam validacao | Se aceitar URLs do usuario: validar schema (apenas https://). Regex ou Zod: z.string().url() + verificar protocolo | Media |

---

## 18. Infrastructure & Transport

| # | Vulnerabilidade | Descricao | Prevencao no WavePlay | Severidade |
|---|-----------------|-----------|----------------------|------------|
| 18.1 | **Man-in-the-Middle** (MITM) | Interceptacao de dados entre cliente e servidor | HTTPS obrigatorio. HSTS header. Certificate pinning no mobile (futuro) | Critica |
| 18.2 | **DNS Spoofing** | Resolucao DNS maliciosa redireciona trafego | HTTPS com certificado valido protege contra isso (o certificado nao vai bater). DNSSEC se disponivel | Media |
| 18.3 | **Subdomain Takeover** | Subdominio apontando para servico inexistente pode ser reivindicado | Remover registros DNS de servicos desativados. Verificar CNAME/A records periodicamente | Media |
| 18.4 | **HTTP Request Smuggling** | Diferenca na interpretacao de Content-Length e Transfer-Encoding entre proxy e servidor | Usar HTTP/2 quando possivel. Configurar proxy (Nginx) para normalizar requests. NestJS sobre Express e geralmente seguro | Alta |
| 18.5 | **HTTP Response Splitting** | CRLF em headers permite injetar resposta HTTP adicional | NestJS sanitiza headers. Nunca inserir input do usuario em headers de resposta | Media |
| 18.6 | **Clickjacking** | Pagina embeddada em iframe malicioso | Helmet configura X-Frame-Options: DENY e CSP frame-ancestors. API pura tem risco menor, mas headers devem estar presentes | Media |
| 18.7 | **Open Redirect** | Parametro de redirect redireciona para site malicioso | Nao temos redirects na API. Se implementar (OAuth callback): validar URL contra whitelist, nunca redirect para URL do usuario | Media |
| 18.8 | **WebSocket Security** | WebSocket sem auth ou validacao de origin | Nao usamos WebSocket na v1. Se implementar: autenticar na conexao, validar origin, rate limiting | Media |
| 18.9 | **Cookie Tossing** | Subdominio malicioso seta cookies para dominio pai | Definir cookie domain explicitamente (nao usar dominio pai). Path restrito (/auth/refresh). Secure flag | Baixa |

---

## 19. Admin BC — RBAC & Authorization

| # | Vulnerabilidade | Descricao | Prevencao no WavePlay | Severidade |
|---|-----------------|-----------|----------------------|------------|
| 19.1 | **Escalacao de privilegio via body** | User comum envia `{ role: 'admin' }` em PATCH /users/me ou register | Role nunca aceita no body de nenhum endpoint (Zod `.strict()`). Promocao admin e manual via seed/DB. `register` sempre cria com `role = 'user'` | Critica |
| 19.2 | **Role exposta em endpoint publico** | Presenter publico vaza campo `role`, permitindo enumeracao de admins | `user-presenter.ts` publico nao inclui `role`. Apenas `admin-user-presenter.ts` expoe, e so e usado em rotas com `@Admin()` | Alta |
| 19.3 | **Bypass do AdminGuard** | Endpoint admin sem o decorator `@Admin()` | Todos os 8 controllers do Admin BC usam `@Admin()`. Revisao em code review + E2E com `registerUser()` (role=user) esperando 403 em todos os endpoints | Critica |
| 19.4 | **Input invalido em rotas admin** | Admin altera plano com preco negativo ou maxProfiles=0 quebrando o dominio | Zod `.strict()` em todos os controllers admin. Regras: `priceCents >= 0`, `maxProfiles >= 1`, `maxStreams >= 1`, `slug` regex `^[a-z0-9-]+$` | Alta |
| 19.5 | **IDOR em rotas admin** | Admin passa UUID invalido na rota e recebe stack trace | Todos os `:id` validados com `z.string().uuid()`. `PlanNotFoundError` / `UserNotFoundError` retornam 404 generico sem expor detalhes | Media |
| 19.6 | **Rate limiting ausente em rotas admin** | Ataque por forca bruta em endpoints caros (analytics, listagem) | `ThrottlerGuard` global aplica rate limit em todas as rotas (default: 300 req/min). Endpoints admin nao tem isencao | Media |
| 19.7 | **Falta de audit log** | Acoes destrutivas (toggle plano, alterar subscription) nao logadas | Logar via `Logger` em `CustomHttpException` handler + no use case. Incluir `adminUserId` no log. (Nota: audit log completo e trabalho futuro — Task 22+) | Media |
| 19.8 | **Delete de plano com subscriptions ativas** | Remover plano quebra integridade referencial e deixa users orfaos | Nao ha endpoint DELETE de plano. Unico mecanismo de desativacao e o toggle (`active: false`) que preserva subscriptions existentes | Alta |

---

## 20. Checklist por Task

Tabela de referencia rapida: quais categorias de vulnerabilidade verificar em cada task.

| Task | Categorias Prioritarias |
|------|------------------------|
| **01 — Setup** | 5 (Misconfiguration), 10 (Components), 4.8-4.9 (Secrets) |
| **02 — Core DDD** | 15.1 (Prototype Pollution), 17.6 (Type Coercion) |
| **03 — Shared Infra** | 5 (Misconfiguration), 1.6-1.7 (CRLF/Log Injection), 4.5 (Erros), 5.1-5.2 (Headers/CORS), 5.11 (Helmet), 13.4 (Payload) |
| **04 — Identity Domain** | 4.3 (Hashing), 4.13 (Random), 2.6 (Password Policy) |
| **05 — Identity Infra** | 1.1 (SQL Injection), 4.3 (Argon2), 4.11 (Encryption at rest), 15.2 (Event Loop) |
| **06 — Register + Auth** | 2 (toda secao), 12.1 (Race Condition), 12.2 (Limites), 2.12 (Enumeration), 11.1 (Logging) |
| **07 — Refresh + Logout** | 2.4-2.5 (Session), 2.14-2.18 (JWT), 15.6 (Timing), 7 (CSRF), 12.3 (Replay) |
| **08 — Password Reset** | 2.11 (Recovery), 2.12 (Enumeration), 4.13 (Random), 15.6 (Timing), 1.12 (Email Injection) |
| **09 — Controllers + Guards** | 3 (toda secao), 5.8 (Cookies), 14 (Mass Assignment), 15.11-15.13 (Guards), 16.2 (Validation), 7.1 (CSRF) |
| **10 — Profile BC** | 3.1-3.2 (IDOR/BOLA), 3.5 (Horizontal), 3.10-3.11 (Metadata/Property), 12.1-12.2 (Race/Limites), 14.1-14.2 (Mass Assignment/Exposure) |
| **11 — Subscription Plans** | 3.3-3.4 (BFLA/Vertical), 12.4 (Parameter Tampering), 14.2 (Excessive Exposure) |
| **12 — Active Streams** | 12.1 (Race Condition), 12.2 (Limites), 3.1 (IDOR), 12.3 (Replay), 12.8 (Negative Values) |
| **13 — Catalog BC** | 8 (SSRF), 16.10 (Unsafe API Consumption), 13.8 (Resource), 16.5 (API Key), 4.10 (Keys no frontend) |
| **14 — Library BC** | 3.1-3.2 (IDOR/BOLA), 3.5 (Horizontal), 12.1 (Race Condition), 14.1 (Mass Assignment) |
| **15 — Playback BC** | 3.1-3.2 (IDOR/BOLA), 12.8 (Negative Values), 12.1 (Race Condition), 12.2 (Limite 50 historico), 14.1 (Mass Assignment) |
| **16 — Integracao + E2E** | Todas — verificacao final de todas as categorias. Testar especialmente: 2 (Auth), 3 (Access Control), 5 (Misconfiguration), 12 (Business Logic) |
| **17 — Admin Domain** | 3.3-3.4 (BFLA/Vertical), 3.11 (Broken Property Auth), 19.1-19.2 (Role no body / exposicao) |
| **18 — Admin Analytics** | 19.3 (@Admin() guard), 19.6 (Rate limit), 13 (DoS em queries pesadas) |
| **19 — Admin User Mgmt** | 19.1 (Role no body), 19.4 (Zod validation), 19.5 (IDOR), 14 (Mass Assignment) |
| **20 — Admin Plan Mgmt** | 19.4 (Zod validation), 19.8 (No DELETE), 3.11 (Slug imutavel), 16.2 (Validation) |
| **21 — Admin Docs** | Revisao final de todas as categorias 19 |

---

> **Como usar**: Antes de implementar cada task, consultar a tabela da secao 20 para saber quais categorias priorizar. Ao finalizar, verificar cada item da categoria correspondente.
