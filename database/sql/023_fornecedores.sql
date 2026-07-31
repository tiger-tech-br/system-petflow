/*
==========================================================
 PETFLOW
 Arquivo: 023_fornecedores.sql
 Descrição: Cadastro de fornecedores do PetFlow.
==========================================================
*/

CREATE TABLE IF NOT EXISTS fornecedores (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    razao_social VARCHAR(150) NOT NULL,

    nome_fantasia VARCHAR(150),

    cnpj VARCHAR(18) NOT NULL UNIQUE,

    inscricao_estadual VARCHAR(30),

    nome_contato VARCHAR(150),

    telefone VARCHAR(20),

    whatsapp VARCHAR(20),

    email VARCHAR(150),

    cep VARCHAR(9),

    endereco VARCHAR(150),

    numero VARCHAR(10),

    complemento VARCHAR(100),

    bairro VARCHAR(100),

    cidade VARCHAR(100),

    estado CHAR(2),

    site VARCHAR(255),

    observacoes TEXT,

    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_fornecedor_razao_social
        CHECK (LENGTH(TRIM(razao_social)) > 0),

    CONSTRAINT chk_fornecedor_cnpj
        CHECK (LENGTH(TRIM(cnpj)) > 0),

    CONSTRAINT chk_fornecedor_estado
        CHECK (
            estado IS NULL
            OR LENGTH(TRIM(estado)) = 2
        )
);

/* ==========================================================
   ÍNDICES
========================================================== */

CREATE INDEX idx_fornecedores_razao_social
ON fornecedores(razao_social);

CREATE INDEX idx_fornecedores_nome_fantasia
ON fornecedores(nome_fantasia);

CREATE INDEX idx_fornecedores_cidade
ON fornecedores(cidade);

CREATE INDEX idx_fornecedores_estado
ON fornecedores(estado);

/* ==========================================================
   TRIGGER
========================================================== */

CREATE TRIGGER trg_fornecedores_updated_at
BEFORE UPDATE ON fornecedores
FOR EACH ROW
EXECUTE FUNCTION atualizar_updated_at();