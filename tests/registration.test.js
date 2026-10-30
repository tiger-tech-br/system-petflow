"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),jwt=require("jsonwebtoken");
const {load,response}=require("./helpers");
const {PRIVACY_POLICY_VERSION}=require("../config/privacyPolicy");
const body={nome:"Cliente Teste",cpf:"52998224725",email:"teste@example.test",telefone:"11999999999",cep:"01310100",endereco:"Avenida Teste",numero:"1",bairro:"Centro",cidade:"São Paulo",estado:"SP",senha:"12345678",aceite_privacidade:true,aceite_termos:true};
test("cadastro confirma após commit sem SMTP e mantém e-mail sem prova de titularidade",async()=>{
    const calls=[];let rolledBack=false;
    const client={async query(sql,params){calls.push({sql,params});return {rows:[{id:"test"}],rowCount:sql.startsWith("SELECT id FROM clientes")?0:1};}};
    const controller=load("controllers/publicCustomerController.js",{
        bcrypt:{async hash(){return "hash";}},
        "../database/connection":{async transaction(fn){try{return await fn(client);}catch(error){rolledBack=true;throw error;}}},
        "../config/env":{JWT_SECRET:"test-secret",APP_URL:"https://example.test"},
        "../services/emailService":{emailVerificationTemplate(){return {subject:"Verifique",text:"Teste"};},async sendEmail(){throw new Error("Network");}}
    });
    const res=response();let error;
    await controller.register({body,ip:"127.0.0.1",get(){return "test";}},res,value=>{error=value;});
    assert.equal(rolledBack,false);assert.equal(error,undefined);assert.equal(res.statusCode,201);assert.match(res.body.message,/já pode entrar/);
    const account=calls.find(c=>c.sql.startsWith("INSERT INTO usuarios_clientes"));
    assert.equal(account.params.length,3);assert.match(account.sql,/FALSE,NULL,NULL,TRUE/);
    const consents=calls.filter(c=>c.sql.startsWith("INSERT INTO lgpd_consentimentos"));
    assert.equal(consents.length,2);assert.deepEqual(consents.map(c=>c.params[2]),["PRIVACIDADE","TERMOS"]);
    assert.ok(consents.every(c=>c.params[3]===PRIVACY_POLICY_VERSION&&c.params[4].length===64&&c.params[5].length===64));
    assert.equal(calls.find(c=>c.sql.startsWith("INSERT INTO clientes")).params.at(-1),PRIVACY_POLICY_VERSION);
});
test("exclusão gera protocolo sem apagar pets, agenda ou pedidos",async()=>{
    const queries=[];const client={async query(sql,params){queries.push({sql,params});return {rows:[]};}};
    const controller=load("controllers/publicCustomerController.js",{
        "../database/connection":{async transaction(fn){return fn(client);}},
        "../config/env":{JWT_SECRET:"test-secret",APP_URL:"https://example.test"},"../services/emailService":{}
    });
    const res=response();await controller.remove({customer:{id:"id",empresaId:"company",email:"test@example.test"}},res,error=>{throw error;});
    assert.equal(res.statusCode,202);assert.match(res.body.protocolo,/^LGPD-/);
    assert.ok(queries.some(q=>q.sql.includes("lgpd_solicitacoes")));
    assert.ok(queries.some(q=>q.sql.includes("sessao_versao")));
    assert.ok(queries.every(q=>!/^DELETE FROM (pets|agendamentos|clientes|vendas)/.test(q.sql)));
    const newsletter=queries.find(q=>q.sql.startsWith("DELETE FROM newsletter_inscritos"));
    assert.match(newsletter.sql,/EXISTS.*c\.id=\$3.*uc\.email_verificado=TRUE/);
    assert.deepEqual(newsletter.params,["company","test@example.test","id"]);
});

test("falha ao registrar ciência e termos reverte o cadastro e duplicação não troca dados",async()=>{
    for(const duplicate of [false,true]) {
        const calls=[];let rolledBack=false;
        const client={async query(sql,params){
            calls.push({sql,params});
            if(sql.startsWith("SELECT id FROM clientes"))return {rows:[],rowCount:duplicate?1:0};
            if(sql.startsWith("INSERT INTO lgpd_consentimentos"))throw new Error("CONSENT_STORAGE_FAILED");
            return {rows:[{id:"test"}],rowCount:1};
        }};
        const controller=load("controllers/publicCustomerController.js",{
            bcrypt:{async hash(){return "hash";}},
            "../database/connection":{async transaction(fn){try{return await fn(client);}catch(error){rolledBack=true;throw error;}}},
            "../config/env":{JWT_SECRET:"test-secret",APP_URL:"https://example.test"},
            "../services/emailService":{async sendEmail(){assert.fail("Nenhum envio deve ocorrer no cadastro");}}
        });
        const res=response();let error;
        await controller.register({body,ip:"127.0.0.1",get(){return "test";}},res,value=>{error=value;});
        assert.equal(rolledBack,true);assert.equal(res.body,undefined);
        if(duplicate){assert.equal(error.status,409);assert.ok(!calls.some(c=>/^INSERT|^UPDATE/.test(c.sql)));}
        else assert.equal(error.message,"CONSENT_STORAGE_FAILED");
    }
});

test("cadastro mantém exigência dos aceites separados sem consultar o banco quando inválidos",async()=>{
    for(const field of ["aceite_privacidade","aceite_termos"]) {
        const controller=load("controllers/publicCustomerController.js",{
            bcrypt:{async hash(){assert.fail("Não deve gerar hash para formulário inválido");}},
            "../database/connection":{async transaction(){assert.fail("Não deve gravar formulário inválido");}},
            "../config/env":{JWT_SECRET:"test-secret",APP_URL:"https://example.test"},"../services/emailService":{}
        });
        const res=response();await controller.register({body:{...body,[field]:false}},res,error=>{throw error;});
        assert.equal(res.statusCode,400);
    }
});

test("login aceita conta não verificada com senha correta e preserva tipo, empresa e versão da sessão",async()=>{
    const id="11111111-1111-4111-8111-111111111111",company="22222222-2222-4222-8222-222222222222",secret="test-secret-not-for-production-0123456789";
    for(const scenario of [{},{password:false},{ativo:false},{usuario_ativo:false},{anonimizado_em:new Date()}]){
        const calls=[],record={id,empresa_id:company,nome:body.nome,email:body.email,senha_hash:"hash",email_verificado:false,ativo:true,usuario_ativo:true,sessao_versao:3,...scenario};
        const controller=load("controllers/publicCustomerController.js",{
            bcrypt:{async compare(){return scenario.password!==false;}},
            "../database/connection":{async query(sql,params){calls.push({sql,params});return {rows:sql.includes("get_petflow_empresa_id")?[{id:company}]:sql.includes("INNER JOIN usuarios_clientes")?[record]:[]};}},
            "../config/env":{JWT_SECRET:secret,JWT_EXPIRES_IN:"1h",APP_URL:"https://example.test"},"../services/emailService":{}
        });
        const res=response();await controller.login({body},res,error=>{throw error;});
        assert.deepEqual(calls.find(c=>c.sql.includes("INNER JOIN usuarios_clientes")).params,[body.email,company]);
        if(Object.keys(scenario).length){
            assert.equal(res.statusCode,401);assert.equal(res.body.data,undefined);assert.ok(!calls.some(c=>c.sql.includes("SET ultimo_login")));
        }else{
            assert.equal(res.statusCode,200);
            const claims=jwt.verify(res.body.data.token,secret,{issuer:"petflow",audience:"petflow:customer"});
            assert.equal(claims.type,"customer");assert.equal(claims.perfil,"CLIENTE");assert.equal(claims.empresaId,company);assert.equal(claims.sessao_versao,3);
            assert.equal(calls.filter(c=>c.sql.includes("SET ultimo_login")).length,1);assert.ok(!calls.some(c=>/SET email_verificado/.test(c.sql)));
        }
    }
});
