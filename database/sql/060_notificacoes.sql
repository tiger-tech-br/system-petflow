/*
==========================================================
 PETFLOW
 Arquivo: 060_notificacoes.sql
 Descrição: Notificações enviadas aos clientes.
==========================================================
*/

CREATE TABLE IF NOT EXISTS notificacoes (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    cliente_id UUID NOT NULL,

    titulo VARCHAR(150) NOT NULL,

    mensagem TEXT NOT NULL,

    tipo VARCHAR(30) NOT NULL
        CHECK (
            tipo IN (
                'AGENDAMENTO',
                'VACINA',
                'CONSULTA',
                'PROMOCAO',
                'SISTEMA'
            )
        ),

    lida BOOLEAN NOT NULL DEFAULT FALSE,

    data_leitura TIMESTAMPTZ,

    enviada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_notificacoes_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES clientes(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_notificacao_titulo
        CHECK (
            LENGTH(TRIM(titulo)) > 0
        ),

    CONSTRAINT chk_notificacao_mensagem
        CHECK (
            LENGTH(TRIM(mensagem)) > 0
        ),

    CONSTRAINT chk_notificacao_data_leitura
        CHECK (
            data_leitura IS NULL
            OR data_leitura >= enviada_em
        )
);

/* ==========================================================
   ÍNDICES
========================================================== */

CREATE INDEX idx_notificacoes_cliente
ON notificacoes(cliente_id);

CREATE INDEX idx_notificacoes_tipo
ON notificacoes(tipo);

CREATE INDEX idx_notificacoes_lida
ON notificacoes(lida);

CREATE INDEX idx_notificacoes_enviada
ON notificacoes(enviada_em);

/* ==========================================================
   TRIGGER
========================================================== */

CREATE TRIGGER trg_notificacoes_updated_at
BEFORE UPDATE ON notificacoes
FOR EACH ROW
EXECUTE FUNCTION atualizar_updated_at();