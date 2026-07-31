/*
==========================================================
 PETFLOW
 Arquivo: 050_vendas.sql
 Descrição: Registro das vendas do PetFlow.
==========================================================
*/

CREATE TABLE IF NOT EXISTS vendas (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    cliente_id UUID,

    usuario_id UUID NOT NULL,

    data_venda TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,

    desconto NUMERIC(10,2) NOT NULL DEFAULT 0,

    acrescimo NUMERIC(10,2) NOT NULL DEFAULT 0,

    valor_final NUMERIC(10,2) NOT NULL DEFAULT 0,

    status VARCHAR(20) NOT NULL DEFAULT 'FINALIZADA'
        CHECK (
            status IN (
                'PENDENTE',
                'FINALIZADA',
                'CANCELADA'
            )
        ),

    observacoes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_vendas_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES clientes(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_vendas_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_vendas_valor_total
        CHECK (valor_total >= 0),

    CONSTRAINT chk_vendas_desconto
        CHECK (desconto >= 0),

    CONSTRAINT chk_vendas_acrescimo
        CHECK (acrescimo >= 0),

    CONSTRAINT chk_vendas_valor_final
        CHECK (valor_final >= 0),

    CONSTRAINT chk_vendas_calculo
        CHECK (
            valor_final = (valor_total - desconto + acrescimo)
        ),

    CONSTRAINT chk_vendas_observacoes
        CHECK (
            observacoes IS NULL
            OR LENGTH(TRIM(observacoes)) > 0
        )
);

/* ==========================================================
   ÍNDICES
========================================================== */

CREATE INDEX idx_vendas_cliente
ON vendas(cliente_id);

CREATE INDEX idx_vendas_usuario
ON vendas(usuario_id);

CREATE INDEX idx_vendas_data
ON vendas(data_venda);

CREATE INDEX idx_vendas_status
ON vendas(status);

/* ==========================================================
   TRIGGER
========================================================== */

CREATE TRIGGER trg_vendas_updated_at
BEFORE UPDATE ON vendas
FOR EACH ROW
EXECUTE FUNCTION atualizar_updated_at();