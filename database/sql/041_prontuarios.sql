/*
==========================================================
 PETFLOW
 Arquivo: 041_prontuarios.sql
 Descrição: Prontuário veterinário dos pets.
==========================================================
*/

CREATE TABLE IF NOT EXISTS prontuarios (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    consulta_id UUID NOT NULL UNIQUE,

    diagnostico TEXT NOT NULL,

    tratamento TEXT,

    medicamentos TEXT,

    receita TEXT,

    exames_solicitados TEXT,

    observacoes TEXT,

    retorno DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_prontuarios_consulta
        FOREIGN KEY (consulta_id)
        REFERENCES consultas(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_prontuario_diagnostico
        CHECK (LENGTH(TRIM(diagnostico)) > 0),

    CONSTRAINT chk_prontuario_tratamento
        CHECK (
            tratamento IS NULL
            OR LENGTH(TRIM(tratamento)) > 0
        ),

    CONSTRAINT chk_prontuario_medicamentos
        CHECK (
            medicamentos IS NULL
            OR LENGTH(TRIM(medicamentos)) > 0
        ),

    CONSTRAINT chk_prontuario_receita
        CHECK (
            receita IS NULL
            OR LENGTH(TRIM(receita)) > 0
        ),

    CONSTRAINT chk_prontuario_exames
        CHECK (
            exames_solicitados IS NULL
            OR LENGTH(TRIM(exames_solicitados)) > 0
        ),

    CONSTRAINT chk_prontuario_observacoes
        CHECK (
            observacoes IS NULL
            OR LENGTH(TRIM(observacoes)) > 0
        )
);

/* ==========================================================
   ÍNDICES
========================================================== */

CREATE INDEX idx_prontuarios_retorno
ON prontuarios(retorno);

/* ==========================================================
   TRIGGER
========================================================== */

CREATE TRIGGER trg_prontuarios_updated_at
BEFORE UPDATE ON prontuarios
FOR EACH ROW
EXECUTE FUNCTION atualizar_updated_at();