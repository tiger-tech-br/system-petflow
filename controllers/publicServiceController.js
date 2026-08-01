"use strict";

const db = require("../database/connection");

async function pets(request, response, next) {
    try {
        const { rows } = await db.query(
            `
                SELECT
                    id,
                    nome,
                    especie,
                    raca,
                    sexo,
                    porte,
                    peso,
                    observacoes
                FROM pets
                WHERE cliente_id = $1
                AND COALESCE(ativo, status, TRUE) = TRUE
                ORDER BY nome ASC
            `,
            [request.customer.id]
        );

        return response.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        next(error);
    }
}

async function criarPet(request, response, next) {
    try {
        const data = request.body;

        if (!hasRequiredPetData(data)) {
            return response.status(400).json({
                success: false,
                message: "Informe o nome e a espécie do pet."
            });
        }

        const empresaId = await getEmpresaId();
        const { rows } = await db.query(
            `
                INSERT INTO pets (
                    empresa_id,
                    cliente_id,
                    nome,
                    especie,
                    raca,
                    sexo,
                    porte,
                    peso,
                    observacoes,
                    ativo,
                    status
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,TRUE)
                RETURNING id, nome, especie, raca, sexo, porte, peso, observacoes
            `,
            petParams(data, empresaId, request.customer.id)
        );

        return response.status(201).json({
            success: true,
            message: "Pet cadastrado com sucesso.",
            data: rows[0]
        });
    } catch (error) {
        next(error);
    }
}

async function atualizarPet(request, response, next) {
    try {
        const data = request.body;

        if (!hasRequiredPetData(data)) {
            return response.status(400).json({
                success: false,
                message: "Informe o nome e a espécie do pet."
            });
        }

        const { rows } = await db.query(
            `
                UPDATE pets
                SET
                    nome = $1,
                    especie = $2,
                    raca = $3,
                    sexo = $4,
                    porte = $5,
                    peso = $6,
                    observacoes = $7,
                    updated_at = NOW()
                WHERE id = $8
                AND cliente_id = $9
                AND COALESCE(ativo, status, TRUE) = TRUE
                RETURNING id, nome, especie, raca, sexo, porte, peso, observacoes
            `,
            [
                data.nome.trim(),
                data.especie.trim(),
                clean(data.raca),
                normalizeEnum(data.sexo),
                normalizeEnum(data.porte),
                normalizeDecimal(data.peso),
                clean(data.observacoes),
                request.params.id,
                request.customer.id
            ]
        );

        if (!rows[0]) {
            return response.status(404).json({
                success: false,
                message: "Pet não encontrado na sua conta."
            });
        }

        return response.status(200).json({
            success: true,
            message: "Pet atualizado com sucesso.",
            data: rows[0]
        });
    } catch (error) {
        next(error);
    }
}

async function removerPet(request, response, next) {
    try {
        const { rowCount } = await db.query(
            `
                UPDATE pets
                SET
                    ativo = FALSE,
                    status = FALSE,
                    updated_at = NOW()
                WHERE id = $1
                AND cliente_id = $2
            `,
            [request.params.id, request.customer.id]
        );

        if (!rowCount) {
            return response.status(404).json({
                success: false,
                message: "Pet não encontrado na sua conta."
            });
        }

        return response.status(200).json({
            success: true,
            message: "Pet removido com sucesso."
        });
    } catch (error) {
        next(error);
    }
}

async function solicitarAgendamento(request, response, next) {
    try {
        const data = request.body;

        if (!data?.servicoId || !data?.petId || !data?.data || !data?.hora) {
            return response.status(400).json({
                success: false,
                message: "Informe serviço, pet, data e horário."
            });
        }

        if (!isFutureDate(data.data)) {
            return response.status(400).json({
                success: false,
                message: "Escolha uma data válida para o agendamento."
            });
        }

        const empresaId = await getEmpresaId();
        const pet = await findCustomerPet(data.petId, request.customer.id);

        if (!pet) {
            return response.status(404).json({
                success: false,
                message: "Pet não encontrado na sua conta."
            });
        }

        const servico = await findService(data.servicoId);

        if (!servico) {
            return response.status(404).json({
                success: false,
                message: "Serviço não encontrado."
            });
        }

        const { rows } = await db.query(
            `
                INSERT INTO agendamentos (
                    empresa_id,
                    cliente_id,
                    pet_id,
                    servico_id,
                    servico,
                    data_agendamento,
                    horario,
                    data,
                    hora,
                    valor,
                    observacoes,
                    status
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$6,$7,$8,$9,'AGENDADO')
                RETURNING id, status, data_agendamento, horario
            `,
            [
                empresaId,
                request.customer.id,
                pet.id,
                servico.id,
                servico.nome,
                data.data,
                data.hora,
                servico.preco || 0,
                clean(data.observacoes)
            ]
        );

        return response.status(201).json({
            success: true,
            message: "Solicitação enviada com sucesso. A equipe PetFlow confirmará o horário.",
            data: rows[0]
        });
    } catch (error) {
        next(error);
    }
}

async function getEmpresaId() {
    const { rows } = await db.query("SELECT get_petflow_empresa_id() AS id");
    return rows[0].id;
}

async function findCustomerPet(id, customerId) {
    const { rows } = await db.query(
        `
            SELECT id
            FROM pets
            WHERE id = $1
            AND cliente_id = $2
            AND COALESCE(ativo, status, TRUE) = TRUE
            LIMIT 1
        `,
        [id, customerId]
    );

    return rows[0] || null;
}

async function findService(id) {
    const { rows } = await db.query(
        `
            SELECT id, nome, preco
            FROM servicos
            WHERE id = $1
            AND ativo = TRUE
            LIMIT 1
        `,
        [id]
    );

    return rows[0] || null;
}

function petParams(data, empresaId, clienteId) {
    return [
        empresaId,
        clienteId,
        data.nome.trim(),
        data.especie.trim(),
        clean(data.raca),
        normalizeEnum(data.sexo),
        normalizeEnum(data.porte),
        normalizeDecimal(data.peso),
        clean(data.observacoes)
    ];
}

function hasRequiredPetData(data) {
    return Boolean(data?.nome && data?.especie);
}

function clean(value) {
    return value ? String(value).trim() : null;
}

function normalizeEnum(value) {
    return value ? String(value).trim().toUpperCase() : null;
}

function normalizeDecimal(value) {
    return value === "" || value == null ? null : Number(value);
}

function isFutureDate(value) {
    const selected = new Date(`${value}T00:00:00`);
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    return !Number.isNaN(selected.getTime()) && selected >= today;
}

module.exports = {
    pets,
    criarPet,
    atualizarPet,
    removerPet,
    solicitarAgendamento
};
