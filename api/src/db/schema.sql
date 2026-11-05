-- Esquema do sistema de avaliação de atendimento (idempotente).

CREATE TABLE IF NOT EXISTS setores (
  sigla   VARCHAR(10)  PRIMARY KEY,
  nome    VARCHAR(150) NOT NULL,
  ordem   SMALLINT     NOT NULL DEFAULT 0,
  ativo   BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS usuarios (
  id               SERIAL       PRIMARY KEY,
  usuario          VARCHAR(50)  NOT NULL UNIQUE,
  nome             VARCHAR(120) NOT NULL,
  perfil           VARCHAR(30)  NOT NULL CHECK (perfil IN ('atendimento', 'assessoria_tecnica')),
  senha_hash       TEXT         NOT NULL,
  ativo            BOOLEAN      NOT NULL DEFAULT TRUE,
  criado_em        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  ultimo_login_em  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS avaliacoes (
  id                 BIGSERIAL    PRIMARY KEY,
  -- Gerado no totem: torna o envio idempotente quando a fila offline reenvia.
  client_id          UUID         NOT NULL UNIQUE,
  totem_id           VARCHAR(50)  NOT NULL,
  respondido_em      TIMESTAMPTZ  NOT NULL,
  recebido_em        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  setor_sigla        VARCHAR(10)  NOT NULL REFERENCES setores (sigla),
  q1_ceat            SMALLINT     NOT NULL CHECK (q1_ceat BETWEEN 1 AND 5),
  q2_cordialidade    SMALLINT     NOT NULL CHECK (q2_cordialidade BETWEEN 1 AND 5),
  q3_clareza         SMALLINT     NOT NULL CHECK (q3_clareza BETWEEN 1 AND 5),
  q4_tempo_resposta  SMALLINT     NOT NULL CHECK (q4_tempo_resposta BETWEEN 1 AND 5),
  q5_resolucao       VARCHAR(12)  NOT NULL CHECK (q5_resolucao IN ('total', 'parcial', 'nao', 'andamento')),
  comentario         VARCHAR(1000)
);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_respondido_em ON avaliacoes (respondido_em);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_setor_data ON avaliacoes (setor_sigla, respondido_em);

CREATE TABLE IF NOT EXISTS auditoria_login (
  id         BIGSERIAL    PRIMARY KEY,
  usuario    VARCHAR(50)  NOT NULL,
  sucesso    BOOLEAN      NOT NULL,
  ip         VARCHAR(64),
  criado_em  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
