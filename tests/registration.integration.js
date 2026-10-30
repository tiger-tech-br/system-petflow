"use strict";
const assert=require("node:assert/strict"),crypto=require("node:crypto"),bcrypt=require("bcrypt");
const {load,response}=require("./helpers");
const {PRIVACY_POLICY_VERSION}=require("../config/privacyPolicy");
const {createSessionMiddleware,signSession}=require("../services/sessionService");

module.exports=async function verifyRegistration({db,company,other,actor,secret}) {
    const database=(await db.query("SELECT current_database() AS name")).rows[0].name;
    assert.match(database,/^petflow_test[a-z0-9_]*$/);
    const marker=crypto.randomBytes(5).toString("hex");
    let smtpCalls=0,optionalVerification=false,verificationUrl;
    const sender={emailVerificationTemplate(options){verificationUrl=options.verifyUrl;return {subject:"Verificação opcional de teste",text:"Teste sintético"};},async sendEmail(){smtpCalls++;assert.equal(optionalVerification,true,"Cadastro não deve depender de SMTP");}};
    const env={JWT_SECRET:secret,JWT_EXPIRES_IN:"1h",APP_URL:"https://example.test"};
    const controller=load("controllers/publicCustomerController.js",{"../database/connection":db,"../config/env":env,"../services/emailService":sender});
    const invoke=async(method,request)=>{const res=response();await controller[method](request,res,error=>{throw error;});return res;};
    function cpf() {
        let digits=Array.from(crypto.randomBytes(9),value=>value%10);
        if(digits.every(value=>value===digits[0]))digits[0]=(digits[0]+1)%10;
        for(const size of [9,10]){const sum=digits.reduce((total,value,index)=>total+value*(size+1-index),0);const digit=sum*10%11;digits.push(digit===10?0:digit);}
        return digits.join("");
    }
    function payload(label) {
        return {nome:"Titular de teste "+label,email:"registration-"+label+"-"+marker+"@example.test",cpf:cpf(),telefone:"119"+String(crypto.randomInt(10000000,99999999)),
            cep:"01310100",endereco:"Rua de teste",numero:"10",bairro:"Centro",cidade:"São Paulo",estado:"SP",senha:crypto.randomBytes(18).toString("hex"),aceite_privacidade:true,aceite_termos:true};
    }
    const req=body=>({body,ip:"127.0.0.1",get:()=>"synthetic-registration-test"});
    const beforeRegistration=payload("unverified");
    await db.query("INSERT INTO newsletter_inscritos(empresa_id,nome,email) VALUES($1,'Titular da inscrição anterior',$2)",[company,beforeRegistration.email]);
    await db.query("INSERT INTO newsletter_inscritos(empresa_id,nome,email) VALUES($1,'Titular externo da inscrição',$2)",[other,beforeRegistration.email]);
    const newsletter=async email=>(await db.query("SELECT * FROM newsletter_inscritos WHERE LOWER(email)=LOWER($1) ORDER BY id",[email])).rows;
    const originalNewsletter=await newsletter(beforeRegistration.email);
    const registered=await invoke("register",req(beforeRegistration));assert.equal(registered.statusCode,201);assert.equal(smtpCalls,0);
    const account=(await db.query("SELECT c.*,uc.senha_hash,uc.email_verificado,uc.token_verificacao_email,uc.token_verificacao_expiracao,uc.sessao_versao FROM clientes c JOIN usuarios_clientes uc ON uc.cliente_id=c.id WHERE c.empresa_id=$1 AND c.email=$2",[company,beforeRegistration.email])).rows[0];
    assert.equal(account.email_verificado,false);assert.equal(account.token_verificacao_email,null);assert.equal(account.token_verificacao_expiracao,null);
    assert.ok(await bcrypt.compare(beforeRegistration.senha,account.senha_hash));assert.equal(account.privacidade_versao,PRIVACY_POLICY_VERSION);
    const consents=(await db.query("SELECT finalidade,versao,concedido FROM lgpd_consentimentos WHERE empresa_id=$1 AND cliente_id=$2 ORDER BY finalidade",[company,account.id])).rows;
    assert.deepEqual(consents,[{finalidade:"PRIVACIDADE",versao:PRIVACY_POLICY_VERSION,concedido:true},{finalidade:"TERMOS",versao:PRIVACY_POLICY_VERSION,concedido:true}]);
    await assert.rejects(invoke("register",req({...beforeRegistration,senha:"different-password"})),{status:409});
    assert.equal((await db.query("SELECT senha_hash FROM usuarios_clientes WHERE cliente_id=$1",[account.id])).rows[0].senha_hash,account.senha_hash);
    const loggedIn=await invoke("login",req(beforeRegistration));assert.equal(loggedIn.statusCode,200);
    const token=loggedIn.body.data.token;
    const authenticate=async bearer=>{const request={headers:{authorization:"Bearer "+bearer}},res=response();let allowed=false;await createSessionMiddleware({db,secret,type:"customer"})(request,res,error=>{if(error)throw error;allowed=true;});return {request,res,allowed};};
    assert.equal((await authenticate(token)).allowed,true);
    assert.equal((await invoke("login",req({...beforeRegistration,senha:"wrong-password"}))).statusCode,401);
    const foreignToken=signSession({...account,empresa_id:other},"customer",secret,"1h");assert.equal((await authenticate(foreignToken)).res.statusCode,401);
    await db.query("UPDATE usuarios_clientes SET ativo=FALSE WHERE cliente_id=$1",[account.id]);
    assert.equal((await authenticate(token)).res.statusCode,401);assert.equal((await invoke("login",req(beforeRegistration))).statusCode,401);
    await db.query("UPDATE usuarios_clientes SET ativo=TRUE WHERE cliente_id=$1",[account.id]);
    await db.query("UPDATE clientes SET ativo=FALSE WHERE id=$1",[account.id]);
    assert.equal((await authenticate(token)).res.statusCode,401);assert.equal((await invoke("login",req(beforeRegistration))).statusCode,401);
    await db.query("UPDATE clientes SET ativo=TRUE WHERE id=$1",[account.id]);
    await db.query("UPDATE usuarios_clientes SET sessao_versao=sessao_versao+1 WHERE cliente_id=$1",[account.id]);
    assert.equal((await authenticate(token)).res.statusCode,401);
    const activeToken=(await invoke("login",req(beforeRegistration))).body.data.token;
    const principal=(await authenticate(activeToken)).request.customer;

    let queued=0;
    const privacy=load("services/privacyService.js",{"./emailQueueService":{async enqueueEmail(){queued++;}}});
    const exported=await privacy.exportCustomerData(db,principal);assert.deepEqual(exported.newsletter,[]);
    assert.doesNotMatch(JSON.stringify(exported),/Titular da inscrição anterior|Titular externo da inscrição/);
    const revocation=(await db.query("INSERT INTO lgpd_solicitacoes(protocolo,empresa_id,cliente_id,tipo) VALUES($1,$2,$3,'REVOGACAO') RETURNING id",["TEST-REVOKE-"+marker,company,account.id])).rows[0];
    await assert.rejects(privacy.processRequest(db,{...actor,body:{confirmacao:"PROCESSAR",finalidade:"NEWSLETTER"}},revocation.id),{status:409});
    assert.equal((await db.query("SELECT status FROM lgpd_solicitacoes WHERE id=$1",[revocation.id])).rows[0].status,"ABERTA");
    assert.deepEqual(await newsletter(beforeRegistration.email),originalNewsletter);
    const removal=await invoke("remove",{customer:principal});assert.equal(removal.statusCode,202);
    assert.deepEqual(await newsletter(beforeRegistration.email),originalNewsletter);assert.equal((await authenticate(activeToken)).res.statusCode,401);
    const erasure=(await db.query("SELECT id FROM lgpd_solicitacoes WHERE protocolo=$1",[removal.body.protocolo])).rows[0];
    const answer=await privacy.processRequest(db,{...actor,body:{confirmacao:"PROCESSAR"}},erasure.id);
    assert.equal(answer.email,null);assert.equal(queued,0);assert.deepEqual(await newsletter(beforeRegistration.email),originalNewsletter);
    const anonymized=(await db.query("SELECT ativo,anonimizado_em FROM clientes WHERE id=$1",[account.id])).rows[0];assert.equal(anonymized.ativo,false);assert.ok(anonymized.anonimizado_em);

    // A comprovação continua disponível, mas somente o token enviado por opção
    // expressa libera a associação à newsletter por e-mail.
    const verified=payload("optional");await invoke("register",req(verified));assert.equal(smtpCalls,0);
    await db.query("INSERT INTO newsletter_inscritos(empresa_id,nome,email) VALUES($1,'Inscrição comprovada',$2)",[company,verified.email]);
    const verifiedAccount=(await db.query("SELECT id FROM clientes WHERE empresa_id=$1 AND email=$2",[company,verified.email])).rows[0];
    const verifiedPrincipal={id:verifiedAccount.id,empresaId:company,email:verified.email};
    assert.deepEqual((await privacy.exportCustomerData(db,verifiedPrincipal)).newsletter,[]);
    optionalVerification=true;
    await invoke("resendVerification",req({email:verified.email}));assert.equal(smtpCalls,1);
    const verificationToken=new URL(verificationUrl).searchParams.get("verificar_email");assert.match(verificationToken,/^[a-f0-9]{64}$/);
    assert.equal((await invoke("verifyEmail",{query:{token:"0".repeat(64)}})).statusCode,400);
    assert.equal((await invoke("verifyEmail",{query:{token:verificationToken}})).statusCode,200);
    assert.equal((await invoke("verifyEmail",{query:{token:verificationToken}})).statusCode,400);
    assert.equal((await privacy.exportCustomerData(db,verifiedPrincipal)).newsletter[0].nome,"Inscrição comprovada");
    const verifiedRevocation=(await db.query("INSERT INTO lgpd_solicitacoes(protocolo,empresa_id,cliente_id,tipo) VALUES($1,$2,$3,'REVOGACAO') RETURNING id",["TEST-VERIFIED-"+marker,company,verifiedAccount.id])).rows[0];
    await privacy.processRequest(db,{...actor,body:{confirmacao:"PROCESSAR",finalidade:"NEWSLETTER"}},verifiedRevocation.id);
    assert.deepEqual(await newsletter(verified.email),[]);assert.equal(queued,1);

    // Falha real de transação após INSERTs não deixa cadastro parcial.
    const rollbackBody=payload("rollback"),failureDb={...db,transaction:callback=>db.transaction(client=>callback({query(sql,params){if(sql.startsWith("INSERT INTO lgpd_consentimentos"))throw new Error("SYNTHETIC_CONSENT_FAILURE");return client.query(sql,params);}}))};
    const failing=load("controllers/publicCustomerController.js",{"../database/connection":failureDb,"../config/env":env,"../services/emailService":sender});
    await assert.rejects(failing.register(req(rollbackBody),response(),error=>{throw error;}),/SYNTHETIC_CONSENT_FAILURE/);
    assert.equal((await db.query("SELECT COUNT(*)::integer AS n FROM clientes WHERE email=$1",[rollbackBody.email])).rows[0].n,0);
    assert.equal((await db.query("SELECT COUNT(*)::integer AS n FROM usuarios_clientes WHERE email=$1",[rollbackBody.email])).rows[0].n,0);
};
