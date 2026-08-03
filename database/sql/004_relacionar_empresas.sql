/*
==========================================================
 PETFLOW
 Arquivo: 004_relacionar_empresas.sql
 Descrição: Relaciona os dados principais à loja PetFlow.
==========================================================
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL DEFAULT 'PetFlow',
    razao_social VARCHAR(150),
    cnpj VARCHAR(18),
    telefone VARCHAR(20),
    email VARCHAR(150),
    endereco VARCHAR(150),
    numero VARCHAR(10),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado CHAR(2),
    cep VARCHAR(9),
    logo TEXT,
    horario_abertura TIME,
    horario_fechamento TIME,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO empresas (nome)
SELECT 'PetFlow'
WHERE NOT EXISTS (
    SELECT 1 FROM empresas
);

CREATE OR REPLACE FUNCTION get_petflow_empresa_id()
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_empresa_id UUID;
BEGIN
    SELECT id
    INTO v_empresa_id
    FROM empresas
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_empresa_id IS NULL THEN
        INSERT INTO empresas (nome)
        VALUES ('PetFlow')
        RETURNING id INTO v_empresa_id;
    END IF;

    RETURN v_empresa_id;
END;
$$;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE itens_compra ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE itens_venda ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS empresa_id UUID;

UPDATE usuarios SET empresa_id = get_petflow_empresa_id() WHERE empresa_id IS NULL;
UPDATE clientes SET empresa_id = get_petflow_empresa_id() WHERE empresa_id IS NULL;
UPDATE categorias SET empresa_id = get_petflow_empresa_id() WHERE empresa_id IS NULL;
UPDATE pets SET empresa_id = get_petflow_empresa_id() WHERE empresa_id IS NULL;
UPDATE produtos SET empresa_id = get_petflow_empresa_id() WHERE empresa_id IS NULL;
UPDATE servicos SET empresa_id = get_petflow_empresa_id() WHERE empresa_id IS NULL;
UPDATE fornecedores SET empresa_id = get_petflow_empresa_id() WHERE empresa_id IS NULL;
UPDATE compras SET empresa_id = get_petflow_empresa_id() WHERE empresa_id IS NULL;
UPDATE vendas SET empresa_id = get_petflow_empresa_id() WHERE empresa_id IS NULL;
UPDATE itens_compra SET empresa_id = get_petflow_empresa_id() WHERE empresa_id IS NULL;
UPDATE itens_venda SET empresa_id = get_petflow_empresa_id() WHERE empresa_id IS NULL;
UPDATE agendamentos SET empresa_id = get_petflow_empresa_id() WHERE empresa_id IS NULL;

ALTER TABLE usuarios ALTER COLUMN empresa_id SET DEFAULT get_petflow_empresa_id();
ALTER TABLE clientes ALTER COLUMN empresa_id SET DEFAULT get_petflow_empresa_id();
ALTER TABLE categorias ALTER COLUMN empresa_id SET DEFAULT get_petflow_empresa_id();
ALTER TABLE pets ALTER COLUMN empresa_id SET DEFAULT get_petflow_empresa_id();
ALTER TABLE produtos ALTER COLUMN empresa_id SET DEFAULT get_petflow_empresa_id();
ALTER TABLE servicos ALTER COLUMN empresa_id SET DEFAULT get_petflow_empresa_id();
ALTER TABLE fornecedores ALTER COLUMN empresa_id SET DEFAULT get_petflow_empresa_id();
ALTER TABLE compras ALTER COLUMN empresa_id SET DEFAULT get_petflow_empresa_id();
ALTER TABLE vendas ALTER COLUMN empresa_id SET DEFAULT get_petflow_empresa_id();
ALTER TABLE itens_compra ALTER COLUMN empresa_id SET DEFAULT get_petflow_empresa_id();
ALTER TABLE itens_venda ALTER COLUMN empresa_id SET DEFAULT get_petflow_empresa_id();
ALTER TABLE agendamentos ALTER COLUMN empresa_id SET DEFAULT get_petflow_empresa_id();

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_usuarios_empresa') THEN
        ALTER TABLE usuarios
        ADD CONSTRAINT fk_usuarios_empresa
        FOREIGN KEY (empresa_id) REFERENCES empresas(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_clientes_empresa') THEN
        ALTER TABLE clientes
        ADD CONSTRAINT fk_clientes_empresa
        FOREIGN KEY (empresa_id) REFERENCES empresas(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_categorias_empresa') THEN
        ALTER TABLE categorias
        ADD CONSTRAINT fk_categorias_empresa
        FOREIGN KEY (empresa_id) REFERENCES empresas(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pets_empresa') THEN
        ALTER TABLE pets
        ADD CONSTRAINT fk_pets_empresa
        FOREIGN KEY (empresa_id) REFERENCES empresas(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_produtos_empresa') THEN
        ALTER TABLE produtos
        ADD CONSTRAINT fk_produtos_empresa
        FOREIGN KEY (empresa_id) REFERENCES empresas(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_servicos_empresa') THEN
        ALTER TABLE servicos
        ADD CONSTRAINT fk_servicos_empresa
        FOREIGN KEY (empresa_id) REFERENCES empresas(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fornecedores_empresa') THEN
        ALTER TABLE fornecedores
        ADD CONSTRAINT fk_fornecedores_empresa
        FOREIGN KEY (empresa_id) REFERENCES empresas(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_compras_empresa') THEN
        ALTER TABLE compras
        ADD CONSTRAINT fk_compras_empresa
        FOREIGN KEY (empresa_id) REFERENCES empresas(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_vendas_empresa') THEN
        ALTER TABLE vendas
        ADD CONSTRAINT fk_vendas_empresa
        FOREIGN KEY (empresa_id) REFERENCES empresas(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_itens_compra_empresa') THEN
        ALTER TABLE itens_compra
        ADD CONSTRAINT fk_itens_compra_empresa
        FOREIGN KEY (empresa_id) REFERENCES empresas(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_itens_venda_empresa') THEN
        ALTER TABLE itens_venda
        ADD CONSTRAINT fk_itens_venda_empresa
        FOREIGN KEY (empresa_id) REFERENCES empresas(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_agendamentos_empresa') THEN
        ALTER TABLE agendamentos
        ADD CONSTRAINT fk_agendamentos_empresa
        FOREIGN KEY (empresa_id) REFERENCES empresas(id);
    END IF;
END;
$$;
