/*
==========================================================
 PETFLOW
 Arquivo: 052_formas_pagamento.sql
 Descrição: Pagamentos realizados nas vendas.
==========================================================
*/

CREATE TABLE IF NOT EXISTS formas_pagamento (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    venda_id UUID NOT NULL,

    forma_pagamento VARCHAR(30) NOT NULL
        CHECK (
            forma_pagamento IN (
                'DINHEIRO',
                'PIX',
                'CARTAO_DEBITO',
                'CARTAO_CREDITO',
                'BOLETO',
                'TRANSFERENCIA',
                'CREDIARIO',
                'OUTRO'
            )
        ),

    valor NUMERIC(10,2) NOT NULL,

    parcelas INTEGER NOT NULL DEFAULT 1,

    observacoes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_formas_pagamento_venda
        FOREIGN KEY (venda_id)
        REFERENCES vendas(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_formas_pagamento_valor
        CHECK (valor >= 0),

    CONSTRAINT chk_formas_pagamento_parcelas
        CHECK (parcelas >= 1),

    CONSTRAINT chk_formas_pagamento_observacoes
        CHECK (
            observacoes IS NULL
            OR LENGTH(TRIM(observacoes)) > 0
        ),

    CONSTRAINT chk_formas_pagamento_credito
        CHECK (
            CASE
                WHEN forma_pagamento = 'CARTAO_CREDITO'
                    THEN parcelas >= 1
                ELSE parcelas = 1
            END
        )
);

/* ==========================================================
   ÍNDICES
========================================================== */

CREATE INDEX idx_formas_pagamento_venda
ON formas_pagamento(venda_id);

CREATE INDEX idx_formas_pagamento_forma
ON formas_pagamento(forma_pagamento);

/* ==========================================================
   TRIGGER
========================================================== */

CREATE TRIGGER trg_formas_pagamento_updated_at
BEFORE UPDATE ON formas_pagamento
FOR EACH ROW
EXECUTE FUNCTION atualizar_updated_at();