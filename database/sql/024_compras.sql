/*
==========================================================
 PETFLOW
 Arquivo: 024_compras.sql
 Descrição: Registro das compras realizadas aos fornecedores.
==========================================================
*/

CREATE TABLE IF NOT EXISTS compras (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    fornecedor_id UUID NOT NULL,

    usuario_id UUID,

    numero_nota_fiscal VARCHAR(50),

    data_compra DATE NOT NULL,

    data_recebimento DATE,

    valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE'
        CHECK (
            status IN (
                'PENDENTE',
                'RECEBIDA',
                'CANCELADA'
            )
        ),

    observacoes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_compras_fornecedor
        FOREIGN KEY (fornecedor_id)
        REFERENCES fornecedores(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_compras_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_compra_valor_total
        CHECK (valor_total >= 0),

    CONSTRAINT chk_compra_nota_fiscal
        CHECK (
            numero_nota_fiscal IS NULL
            OR LENGTH(TRIM(numero_nota_fiscal)) > 0
        ),

    CONSTRAINT chk_compra_observacoes
        CHECK (
            observacoes IS NULL
            OR LENGTH(TRIM(observacoes)) > 0
        )
);

/* ==========================================================
   ÍNDICES
========================================================== */

CREATE INDEX idx_compras_fornecedor
ON compras(fornecedor_id);

CREATE INDEX idx_compras_usuario
ON compras(usuario_id);

CREATE INDEX idx_compras_data
ON compras(data_compra);

CREATE INDEX idx_compras_status
ON compras(status);

CREATE INDEX idx_compras_nota
ON compras(numero_nota_fiscal);

/* ==========================================================
   TRIGGER
========================================================== */

CREATE TRIGGER trg_compras_updated_at
BEFORE UPDATE ON compras
FOR EACH ROW
EXECUTE FUNCTION atualizar_updated_at();