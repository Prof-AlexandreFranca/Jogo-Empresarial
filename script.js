// =========================================================================
// JOGO EMPRESARIAL — MOTOR DE ESTOQUE, PRODUÇÃO, VENDAS E NEGOCIAÇÃO
// =========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBV43NceEugrdhkWxFCQkh5xAx4TSRpbbc",
  authDomain: "jogo-empresarial-df882.firebaseapp.com",
  databaseURL: "https://jogo-empresarial-df882-default-rtdb.firebaseio.com",
  projectId: "jogo-empresarial-df882",
  storageBucket: "jogo-empresarial-df882.firebasestorage.app",
  messagingSenderId: "874868899944",
  appId: "1:874868899944:web:697a1cedbdd7b456073bdd",
  measurementId: "G-9RD7G3FLYM"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const SENHAS = { grupo1:"101", grupo2:"202", grupo3:"303", grupo4:"404", grupo5:"505", grupo6:"606", professor:"prof2026" };
const PRECO_BASE = 50;
const DEMANDA_BASE = 3000;
const CUSTO_INSUMO_A = 12;
const CUSTO_INSUMO_B = 14;
const CUSTO_FABRICAR_INSUMO = 7;
const CUSTO_FIXO_BASE = 6000;
const PACOTES_CAMPANHA = {0:{valor:0,fator:0},1:{valor:1000,fator:1},2:{valor:3000,fator:1.7},3:{valor:5000,fator:2.3}};
const CUSTO_PRODUCAO_ACABADO = 0;
const CUSTO_DELIVERY = 5;
const CUSTO_FUNCIONARIO = 3000;
const LIMITE_CREDITO = 10000;

const CENARIOS = [
  {id:1,nome:"1. Mercado Estável (Início de Ano)",desc:"Demanda normal de 3.000 compradores. Equilíbrio entre preço, marketing, branding e parcerias.",demandaMult:1,pesoPreco:1,pesoMkt:1,pesoBranding:1,pesoB2B:1.35,custoFixo:6000},
  {id:2,nome:"2. Black Friday / Alta Temporada",desc:"Demanda +50%. Consumidores ficam muito mais sensíveis ao preço.",demandaMult:1.5,pesoPreco:2,pesoMkt:1.2,pesoBranding:.8,pesoB2B:1.35,custoFixo:6500},
  {id:3,nome:"3. Crise Econômica e Inflação",desc:"Demanda -30%, custo fixo maior e preço competitivo é vital.",demandaMult:.7,pesoPreco:1.8,pesoMkt:.9,pesoBranding:1,pesoB2B:1.35,custoFixo:7500},
  {id:4,nome:"4. Boom do Consumo Consciente",desc:"Demanda +10%. Branding e parcerias B2B ganham força.",demandaMult:1.1,pesoPreco:.7,pesoMkt:1,pesoBranding:2,pesoB2B:1.6,custoFixo:6000},
  {id:5,nome:"5. Viralização nas Redes Sociais",desc:"Demanda +30%. Marketing de atração tem efeito dobrado.",demandaMult:1.3,pesoPreco:1,pesoMkt:2.2,pesoBranding:1.2,pesoB2B:1.35,custoFixo:6000},
  {id:6,nome:"6. Onda de Calor / Clima Extremo",desc:"Demanda +20%. Eficiência operacional e parcerias ganham força.",demandaMult:1.2,pesoPreco:1,pesoMkt:1.3,pesoBranding:1.3,pesoB2B:1.5,custoFixo:6200},
  {id:7,nome:"7. Greve nos Transportes (Gargalo)",desc:"Demanda -10%. Contratos locais entre grupos valem mais.",demandaMult:.9,pesoPreco:.9,pesoMkt:1,pesoBranding:1.2,pesoB2B:1.7,custoFixo:6500},
  {id:8,nome:"8. Entrada de Concorrente Estrangeiro",desc:"Demanda -20%. Branding forte retém clientes.",demandaMult:.8,pesoPreco:1.2,pesoMkt:1.1,pesoBranding:2.2,pesoB2B:1.4,custoFixo:6000},
  {id:9,nome:"9. Feira de Negócios da Cidade",desc:"Demanda +40%. Contratos entre equipes geram bônus máximo.",demandaMult:1.4,pesoPreco:1,pesoMkt:1.4,pesoBranding:1.3,pesoB2B:1.8,custoFixo:6000},
  {id:10,nome:"10. Fechamento de Ano / Sazonalidade",desc:"Demanda +25%. Marketing e reputação acumulada são decisivos.",demandaMult:1.25,pesoPreco:1.1,pesoMkt:1.6,pesoBranding:1.6,pesoB2B:1.5,custoFixo:6500}
];

function equipeInicial(id) {
  return {id,nome:`${id.replace('grupo','Grupo ')} (Configure seu Nome)`,slogan:"Defina seu pitch comercial na aba Meu Prospect",b2c:"Produto acabado ao consumidor",b2b:"Insumos universais e soluções para empresas da sala",valorTabela:5000,pagPadrao:"avista",prazoPadrao:"imediato",caixa:35000,caixaAnteriorRodada:35000,branding:10,share:0,score:0,estrelas:0,enviou:false,decisao:null,receberFuturo:0,pagarFuturo:0,bonusFuturo:1,dividaVencida:0,historico:[],estoque:{insumoComprado:0,insumoFabricado:0,produtoAcabado:0},estoqueReservado:{insumoComprado:0,insumoFabricado:0,insumoFabricadoProgramado:0,produtoAcabado:0},comprasPendentes:[]};
}
const DADOS_INICIAIS = {estado:{rodada:1,cenarioId:1,aberta:true},equipes:{grupo1:equipeInicial('grupo1'),grupo2:equipeInicial('grupo2'),grupo3:equipeInicial('grupo3'),grupo4:equipeInicial('grupo4'),grupo5:equipeInicial('grupo5'),grupo6:equipeInicial('grupo6')},contratos:{}};
let usuarioAtual=null, chartInstance=null, dadosGlobais=null, compraBTimer=null;

function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
function money(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
function stars(v){return (clamp(Number(v)||0,0,100)/20).toFixed(1);}
function safeEq(eq,id){
  eq.id ||= id; if(!['avista','prazo30'].includes(eq.pagPadrao))eq.pagPadrao='avista'; eq.caixaAnteriorRodada=Number(eq.caixaAnteriorRodada??eq.caixa??35000); eq.nome ||= `${id} (Configure seu Nome)`; eq.caixa=Number(eq.caixa??35000); eq.branding=Number(eq.branding??10); eq.share=Number(eq.share??0); eq.score=Number(eq.score??0); eq.estrelas=Number(eq.estrelas??0); eq.historico ||= []; eq.receberFuturo=Number(eq.receberFuturo??0); eq.pagarFuturo=Number(eq.pagarFuturo??0); eq.dividaVencida=Number(eq.dividaVencida??0); eq.comprasPendentes ||= [];
  eq.estoque ||= {insumoComprado:0,insumoFabricado:0,produtoAcabado:0}; eq.movimentosRodada ||= {}; eq.movimentosRodada.fabricacao=Number(eq.movimentosRodada.fabricacao??0); eq.movimentosRodada.custoFabricacao=Number(eq.movimentosRodada.custoFabricacao??0); eq.movimentosRodada.producaoAcabado=Number(eq.movimentosRodada.producaoAcabado??0); eq.movimentosRodada.compradoFornecedorB=Number(eq.movimentosRodada.compradoFornecedorB??0); eq.movimentosRodada.compradoB2BImediato=Number(eq.movimentosRodada.compradoB2BImediato??0); eq.estoqueAnteriorRodada ||= {insumoComprado:Number(eq.estoque.insumoComprado??0),insumoFabricado:Number(eq.estoque.insumoFabricado??0)}; eq.estoque.insumoComprado=Number(eq.estoque.insumoComprado??0); eq.estoque.insumoFabricado=Number(eq.estoque.insumoFabricado??0); eq.estoque.produtoAcabado=Number(eq.estoque.produtoAcabado??0); eq.estoqueReservado ||= {insumoComprado:0,insumoFabricado:0,insumoFabricadoProgramado:0,produtoAcabado:0}; eq.estoqueReservado.insumoFabricadoProgramado=Number(eq.estoqueReservado.insumoFabricadoProgramado??eq.estoqueReservado.insumoFabricado??0); Object.keys(eq.estoqueReservado).forEach(k=>eq.estoqueReservado[k]=Number(eq.estoqueReservado[k]??0));
  return eq;
}
function normalizar(root){
  root.estado ||= {rodada:1,cenarioId:1,aberta:true}; root.contratos ||= {};
  Object.keys(DADOS_INICIAIS.equipes).forEach(id=>{root.equipes ||= {}; root.equipes[id]=safeEq(root.equipes[id]||equipeInicial(id),id);});
  return root;
}

// Migração não destrutiva dos dados antigos para os três estoques.
db.ref('/').once('value',snap=>{if(!snap.exists()) db.ref('/').set(DADOS_INICIAIS); else {const r=normalizar(snap.val()); const patch={}; Object.keys(r.equipes).forEach(id=>{if(!snap.val().equipes?.[id]?.estoque) patch[`equipes/${id}/estoque`]=r.equipes[id].estoque; if(!snap.val().equipes?.[id]?.comprasPendentes) patch[`equipes/${id}/comprasPendentes`]=[];}); if(Object.keys(patch).length) db.ref('/').update(patch);}});

function fazerLogin(){const role=document.getElementById('login-role').value,pass=document.getElementById('login-pass').value.trim(),err=document.getElementById('login-error'); if(SENHAS[role]===pass){usuarioAtual=role;err.textContent='';document.getElementById('login-screen').classList.add('hidden');if(role==='professor'){document.getElementById('professor-screen').classList.remove('hidden');iniciarListenerProfessor();}else{document.getElementById('student-screen').classList.remove('hidden');iniciarListenerAluno();}}else err.textContent='Senha incorreta! Verifique com o professor.';}
function logout(){location.reload();}
function openTab(id,btn){document.querySelectorAll('.tab-content').forEach(e=>e.classList.add('hidden'));document.querySelectorAll('.tab-btn').forEach(e=>e.classList.remove('active'));document.getElementById(id).classList.remove('hidden');btn.classList.add('active');}
function estoqueTexto(eq){const e=eq.estoque;return `Comprado: ${e.insumoComprado} | Fabricado: ${e.insumoFabricado} | Acabado: ${e.produtoAcabado}`;}
function campanhaValor(id){return PACOTES_CAMPANHA[Number(id)||0]?.valor||0;}
function campanhaFator(id){return PACOTES_CAMPANHA[Number(id)||0]?.fator||0;}
function valoresDecisao(d){
  const mktPacote=Number(d.mktPacote??0), brandingPacote=Number(d.brandingPacote??0);
  return {mkt:mktPacote?campanhaValor(mktPacote):Number(d.mkt||0), branding:brandingPacote?campanhaValor(brandingPacote):Number(d.branding||0), mktFator:mktPacote?campanhaFator(mktPacote):(Number(d.mkt||0)?1:0), brandingFator:brandingPacote?campanhaFator(brandingPacote):(Number(d.branding||0)?1:0)};
}
function agendarCompraFornecedorB(){
  clearTimeout(compraBTimer);
  compraBTimer=setTimeout(processarCompraFornecedorB,250);
}
function processarCompraFornecedorB(){
  if(!rodadaEditavel())return;
  const campo=document.getElementById('dec-compra-b');
  const desejada=Math.max(0,Math.floor(Number(campo?.value||0)));
  db.ref('/').transaction(root=>{
    const e=root?.equipes?.[usuarioAtual];
    if(!e||e.enviou)return;
    safeEq(e,usuarioAtual);
    const aplicada=Number(e.movimentosRodada.compradoFornecedorB||0),delta=desejada-aplicada;
    if(delta>0){
      const custo=delta*CUSTO_INSUMO_B;
      if(Number(e.caixa||0)<custo)return;
      e.caixa-=custo;
      e.estoque.insumoComprado+=delta;
      e.movimentosRodada.compradoFornecedorB+=delta;
    }else if(delta<0){
      const devolucao=-delta;
      if(Number(e.estoque.insumoComprado||0)<devolucao)return;
      e.caixa+=devolucao*CUSTO_INSUMO_B;
      e.estoque.insumoComprado-=devolucao;
      e.movimentosRodada.compradoFornecedorB-=devolucao;
    }
    return root;
  },(err,committed)=>{
    if(err)return alert('Não foi possível processar a compra do fornecedor B: '+err.message);
    if(!committed){
      const aplicado=Number(dadosGlobais?.equipes?.[usuarioAtual]?.movimentosRodada?.compradoFornecedorB||0);
      if(campo)campo.value=aplicado;
      alert('Compra do fornecedor B não realizada: caixa insuficiente ou estoque indisponível para desfazer a alteração.');
    }
  });
}
function atualizarResumoDecisao(){
  if(!dadosGlobais||!usuarioAtual||usuarioAtual==='professor')return;
  const eq=dadosGlobais.equipes[usuarioAtual];if(!eq)return;
  const val=id=>Number(document.getElementById(id)?.value||0),checked=id=>Boolean(document.getElementById(id)?.checked),d={qA:val('dec-compra-a'),qB:val('dec-compra-b'),mktPacote:val('dec-mkt-pacote'),brandingPacote:val('dec-branding-pacote'),delivery:checked('dec-delivery'),funcionario:checked('dec-funcionario')},aplicado=Boolean(eq.decisao?.aplicada),camp=valoresDecisao(d),cen=CENARIOS.find(c=>c.id==dadosGlobais.estado.cenarioId)||CENARIOS[0];
  const contratos=Object.values(dadosGlobais.contratos||{}).filter(c=>c.rodada===dadosGlobais.estado.rodada&&c.status==='aceito'),comprasB2B=contratos.filter(c=>c.comprador===usuarioAtual),vendasB2B=contratos.filter(c=>c.vendedor===usuarioAtual),isProgramada=c=>c.prazo==='programado',sumQtd=(arr,p)=>arr.filter(c=>isProgramada(c)===p).reduce((a,c)=>a+Number(c.qtdInsumo||0),0),sumValor=(arr,pag)=>arr.filter(c=>c.pagamento===pag).reduce((a,c)=>a+Number(c.valor||0),0),entradaB2B=vendasB2B.filter(c=>c.pagamento==='avista'&&c.entregaExecutada).reduce((a,c)=>a+Number(c.valor||0),0),receberB2B=vendasB2B.filter(c=>c.pagamento==='prazo30'&&!c.financeiroExecutado).reduce((a,c)=>a+Number(c.valor||0),0),pagarB2B=comprasB2B.filter(c=>c.pagamento==='prazo30'&&!c.financeiroExecutado).reduce((a,c)=>a+Number(c.valor||0),0);
  const mov=eq.movimentosRodada||{},custoFornecedorBResumo=Math.max(Number(mov.compradoFornecedorB||0),Number(d.qB||0))*CUSTO_INSUMO_B,comprasB2BAvista=comprasB2B.filter(c=>c.pagamento==='avista'&&c.entregaExecutada).reduce((a,c)=>a+Number(c.valor||0),0),custosImediatos=Number(mov.custoFabricacao||0)+custoFornecedorBResumo+Number(mov.compradoB2BImediato||0)*0,fixo=Number(cen.custoFixo||CUSTO_FIXO_BASE)+(d.funcionario?CUSTO_FUNCIONARIO:0),despesas=(aplicado?0:d.qA*CUSTO_INSUMO_A)+camp.mkt+camp.branding+custosImediatos+comprasB2BAvista,compradoAnterior=Number(eq.estoqueAnteriorRodada?.insumoComprado??0),compradoAtual=Math.max(Number(eq.movimentosRodada?.compradoFornecedorB||0),Number(d.qB||0))+Number(eq.movimentosRodada?.compradoB2BImediato||0),compradoProgramado=(aplicado?0:d.qA)+(eq.comprasPendentes||[]).reduce((a,x)=>a+Number(x.qtd||0),0)+sumQtd(comprasB2B,true),compradoDisponivel=Number(eq.estoque.insumoComprado||0),fabricadoAnterior=Number(eq.estoqueAnteriorRodada?.insumoFabricado??0),fabricadoAtual=Number(eq.movimentosRodada?.fabricacao||0),fabricadoReservado=Number(eq.estoqueReservado?.insumoFabricado||0),fabricadoDisponivel=Math.max(0,Number(eq.estoque.insumoFabricado||0)-fabricadoReservado),consolidado=compradoDisponivel+fabricadoDisponivel,contasAReceber=receberB2B,contasAPagar=pagarB2B,saldoAnterior=Number(eq.caixaAnteriorRodada??eq.caixa??0),saldoAtual=saldoAnterior+entradaB2B-fixo-despesas,saldoProjetado=saldoAtual+contasAReceber-contasAPagar;
  const set=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text;};
  set('dec-caixa-anterior',money(saldoAnterior));set('dec-entrada-b2b',money(entradaB2B));set('dec-custo-fixo',money(fixo));set('dec-despesas',money(despesas));set('dec-caixa-disp',money(saldoAtual));set('dec-contas-receber',money(contasAReceber));set('dec-contas-futuras',money(contasAPagar));set('dec-saldo-projetado',money(saldoProjetado));set('dec-estoque-comprado-anterior',`${compradoAnterior} un.`);set('dec-estoque-comprado-atual',`${compradoAtual} un.`);set('dec-estoque-comprado-programado',`${compradoProgramado} un.`);set('dec-estoque-comprado',`${compradoDisponivel} un.`);set('dec-estoque-fabricado-anterior',`${fabricadoAnterior} un.`);set('dec-estoque-fabricado',`${fabricadoAtual} un.`);set('dec-estoque-fabricado-reservado',`${fabricadoReservado} un.`);set('dec-estoque-fabricado-programado',`${Number(eq.estoqueReservado?.insumoFabricadoProgramado||0)} un.`);set('dec-estoque-fabricado-disponivel',`${fabricadoDisponivel} un.`);set('dec-estoque-consolidado',`${consolidado} un.`);set('dec-estoque-acabado',`${Number(eq.estoque.produtoAcabado||0)} un.`);
}

function iniciarListenerAluno(){db.ref('/').on('value',snap=>{dadosGlobais=normalizar(snap.val()||{});const eq=dadosGlobais.equipes[usuarioAtual],est=dadosGlobais.estado,cen=CENARIOS.find(c=>c.id==est.cenarioId)||CENARIOS[0];
  document.getElementById('st-company-title').textContent=eq.nome; document.getElementById('st-round-badge').textContent=`Mês ${est.rodada}`; document.getElementById('dec-round-label').textContent=`Mês ${est.rodada}`; document.getElementById('st-scenario-name').textContent=cen.nome; document.getElementById('st-scenario-desc').textContent=cen.desc;
  const badge=document.getElementById('st-status-badge'),podeEditar=Boolean(est.aberta&&!eq.enviou); if(podeEditar){badge.textContent='Rodada Aberta';badge.className='badge badge-open';document.getElementById('locked-alert').classList.add('hidden');}else{badge.textContent=eq.enviou?'Decisão Enviada (Aguardando)':'Rodada Bloqueada';badge.className='badge badge-closed';document.getElementById('locked-alert').classList.remove('hidden');} habilitarEdicoesAluno(podeEditar);
  document.getElementById('kpi-caixa').textContent=money(eq.caixa);document.getElementById('dec-caixa-disp').textContent=money(eq.caixa);document.getElementById('kpi-share').textContent=`${(eq.share||0).toFixed(1)}%`;document.getElementById('kpi-futuro').textContent=`+${money(eq.receberFuturo)} / -${money(eq.pagarFuturo)}`;document.getElementById('kpi-score').textContent=`${Math.round(eq.score||0)} pts`;document.getElementById('kpi-stars').textContent=`${stars(eq.score||0)} / 5`;document.getElementById('kpi-estoque').textContent=estoqueTexto(eq);document.getElementById('kpi-divida').textContent=money(eq.dividaVencida||0);const ultimoResultado=(eq.historico||[]).at(-1),eventoEstoque=ultimoResultado?.vendasPerdidasEstoque>0?`${ultimoResultado.vendasPerdidasEstoque} clientes não atendidos por falta de produto acabado`:ultimoResultado?.perdidasEstoque>0?`${ultimoResultado.perdidasEstoque} produto(s) acabado(s) venceram e foram descartados`:'Nenhum evento de estoque acabado';document.getElementById('kpi-estoque-evento').textContent=eventoEstoque;
  if(!document.getElementById('pros-nome').dataset.loaded){['nome','slogan','b2c','b2b'].forEach(k=>document.getElementById('pros-'+k).value=eq[k]||'');document.getElementById('pros-valor').value=eq.valorTabela||5000;document.getElementById('pros-pagamento').value=eq.pagPadrao||'avista';document.getElementById('pros-prazo').value=eq.prazoPadrao||'imediato';document.getElementById('pros-nome').dataset.loaded='true';}
  renderizarHistoricoAluno(eq.historico||[]);renderizarVitrineEContratos();
  if(eq.decisao){['preco','qA','qB'].forEach(k=>{const el=document.getElementById({'preco':'dec-preco','qA':'dec-compra-a','qB':'dec-compra-b'}[k]);if(el&&document.activeElement!==el)el.value=eq.decisao[k]??0;});['mktPacote','brandingPacote'].forEach(k=>{const el=document.getElementById(k==='mktPacote'?'dec-mkt-pacote':'dec-branding-pacote');if(el&&document.activeElement!==el)el.value=eq.decisao[k]??0;});['delivery','funcionario'].forEach(k=>{const el=document.getElementById('dec-'+k);if(el&&document.activeElement!==el)el.checked=Boolean(eq.decisao[k]);});}
  ['dec-compra-a','dec-compra-b','dec-fabrica-qtd','dec-produz-acabado-qtd','dec-mkt-pacote','dec-branding-pacote','dec-delivery','dec-funcionario'].forEach(id=>{const el=document.getElementById(id);if(el&&!el.dataset.bound){el.addEventListener('input',atualizarResumoDecisao);el.addEventListener('change',atualizarResumoDecisao);if(id==='dec-compra-b')el.addEventListener('input',agendarCompraFornecedorB);el.dataset.bound='true';}}); atualizarResumoDecisao();
});}
function habilitarFormDecisao(on){document.querySelectorAll('#decision-form input,#decision-form select,#decision-form button').forEach(e=>e.disabled=!on);}
function habilitarEdicoesAluno(on){
  habilitarFormDecisao(on);
  document.querySelectorAll('#prospect-form input,#prospect-form select,#prospect-form button,#contrato-form input,#contrato-form select,#contrato-form button').forEach(e=>e.disabled=!on);
  document.querySelectorAll('#vitrine-grid button,#incoming-proposals-list button').forEach(e=>e.disabled=!on);
  if(!on)fecharModal();
}
function rodadaEditavel(){return Boolean(dadosGlobais&&usuarioAtual&&usuarioAtual!=='professor'&&dadosGlobais.estado?.aberta&&!dadosGlobais.equipes?.[usuarioAtual]?.enviou);}
function salvarProspect(ev){ev.preventDefault();if(!rodadaEditavel()){alert('As decisões deste mês já foram confirmadas e estão bloqueadas. Aguarde a próxima rodada.');return;}db.ref(`equipes/${usuarioAtual}`).update({nome:document.getElementById('pros-nome').value,slogan:document.getElementById('pros-slogan').value,b2c:document.getElementById('pros-b2c').value,b2b:document.getElementById('pros-b2b').value,valorTabela:Number(document.getElementById('pros-valor').value),pagPadrao:document.getElementById('pros-pagamento').value,prazoPadrao:document.getElementById('pros-prazo').value});alert('Vitrine Comercial atualizada com sucesso!');}

function renderizarResumoB2B(){
  if(!dadosGlobais||!usuarioAtual||usuarioAtual==='professor')return;const rod=dadosGlobais.estado.rodada,cs=Object.values(dadosGlobais.contratos||{}).filter(c=>c.rodada===rod&&c.status==='aceito');
  const compra=cs.filter(c=>c.comprador===usuarioAtual),venda=cs.filter(c=>c.vendedor===usuarioAtual),q=(arr,programada)=>arr.filter(c=>(c.prazo==='programado')===programada).reduce((a,c)=>a+Number(c.qtdInsumo||0),0),valor=(arr,pag)=>arr.filter(c=>c.pagamento===pag).reduce((a,c)=>a+Number(c.valor||0),0),set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  set('b2b-compra-q-imediata',`${q(compra,false)} un.`);set('b2b-compra-q-programada',`${q(compra,true)} un.`);set('b2b-compra-avista',money(valor(compra,'avista')));set('b2b-compra-prazo',money(valor(compra,'prazo30')));
  set('b2b-venda-q-imediata',`${q(venda,false)} un.`);set('b2b-venda-q-programada',`${q(venda,true)} un.`);set('b2b-venda-avista',money(valor(venda,'avista')));set('b2b-venda-prazo',money(valor(venda,'prazo30')));const eq=dadosGlobais.equipes[usuarioAtual],disponivel=Math.max(0,Number(eq?.estoque?.insumoFabricado||0)-Number(eq?.estoqueReservado?.insumoFabricado||0));set('b2b-estoque-fabricado-disponivel',`${disponivel} un.`);
}
function renderizarVitrineEContratos(){renderizarResumoB2B();const grid=document.getElementById('vitrine-grid');if(!grid||!dadosGlobais)return;grid.innerHTML='';const podeEditar=rodadaEditavel();Object.values(dadosGlobais.equipes).forEach(emp=>{if(emp.id===usuarioAtual)return;grid.innerHTML+=`<div class="vitrine-card"><div><h4>${emp.nome}</h4><p class="muted"><em>"${emp.slogan||''}"</em></p><div class="vitrine-tag"><strong>Oferece:</strong> ${emp.b2b||'Insumos universais'}</div><p style="font-size:.85rem;margin-top:5px;"><strong>Preço tabela:</strong> ${money(emp.valorTabela||0)}</p></div><button ${podeEditar?'':'disabled'} onclick="abrirModalContrato('${emp.id}')" class="btn btn-primary btn-sm mt-15">🤝 Negociar / Contratar</button></div>`;});
  const contratos=Object.entries(dadosGlobais.contratos||{}),rod=dadosGlobais.estado.rodada,incoming=document.getElementById('incoming-proposals-list'),active=document.getElementById('active-contracts-list');incoming.innerHTML='';active.innerHTML='';let n=0;contratos.forEach(([cid,c])=>{if(c.rodada!==rod)return;const comp=dadosGlobais.equipes[c.comprador],vend=dadosGlobais.equipes[c.vendedor];if(!comp||!vend)return;const podeResponder=c.status==='pendente'||c.status==='bloqueado';if(c.vendedor===usuarioAtual&&podeResponder){n++;incoming.innerHTML+=`<div class="proposal-item"><div><strong>Proposta de ${comp.nome}</strong> — ${money(c.valor)}<br><small>${c.qtdInsumo||0} un. de insumo fabricado (${c.pagamento}/${c.prazo})<br>${c.clausula||''}</small>${c.motivo?`<br><span class="error-msg">Última tentativa: ${c.motivo}. Corrija o estoque/caixa e tente novamente.</span>`:''}</div><div><button ${rodadaEditavel()?'':'disabled'} onclick="responderContrato('${cid}','aceito')" class="btn btn-success btn-sm">Aceitar / tentar novamente</button><button ${rodadaEditavel()?'':'disabled'} onclick="responderContrato('${cid}','recusado')" class="btn btn-danger btn-sm">Recusar</button></div></div>`;}if((c.comprador===usuarioAtual||c.vendedor===usuarioAtual)&&c.status!=='recusado'){const papel=c.comprador===usuarioAtual?`Você contratou <strong>${vend.nome}</strong>`:`<strong>${comp.nome}</strong> contratou você`;active.innerHTML+=`<div class="proposal-item"><div>${papel} — ${money(c.valor)}<br><small>${c.qtdInsumo||0} un. de insumo fabricado — ${c.clausula||''}</small>${c.motivo?`<br><span class="error-msg">${c.motivo}</span>`:''}</div><span class="badge ${c.status==='aceito'?'badge-open':''}">${String(c.status).toUpperCase()}</span></div>`;}});if(!n)incoming.innerHTML='<p class="muted">Nenhuma proposta pendente no momento.</p>';if(!active.innerHTML)active.innerHTML='<p class="muted">Nenhum contrato registrado neste mês.</p>';const b=document.getElementById('notif-badge');b.textContent=n;if(n)b.classList.remove('hidden');else b.classList.add('hidden');}
function abrirModalContrato(id){if(!rodadaEditavel()){alert('As decisões deste mês já foram confirmadas e estão bloqueadas. Aguarde a próxima rodada.');return;}const emp=dadosGlobais.equipes[id];document.getElementById('prop-target-id').value=id;document.getElementById('modal-target-name').textContent=`Negociar com ${emp.nome}`;document.getElementById('modal-target-desc').textContent=emp.b2b;document.getElementById('prop-valor').value=emp.valorTabela||5000;document.getElementById('prop-pagamento').value=emp.pagPadrao||'avista';document.getElementById('prop-prazo').value=emp.prazoPadrao||'imediato';document.getElementById('modal-contrato').classList.remove('hidden');}
function fecharModal(){document.getElementById('modal-contrato').classList.add('hidden');}
function enviarPropostaContrato(ev){ev.preventDefault();if(!rodadaEditavel()){fecharModal();alert('As decisões deste mês já foram confirmadas e estão bloqueadas. Aguarde a próxima rodada.');return;}const target=document.getElementById('prop-target-id').value;db.ref('contratos').push({rodada:dadosGlobais.estado.rodada,comprador:usuarioAtual,vendedor:target,valor:Number(document.getElementById('prop-valor').value),qtdInsumo:Number(document.getElementById('prop-qtd').value),tipoInsumo:'fabricado',pagamento:document.getElementById('prop-pagamento').value,prazo:document.getElementById('prop-prazo').value,clausula:document.getElementById('prop-clausula').value,status:'pendente'});fecharModal();alert('Proposta enviada! Peça para a outra equipe aceitar na aba Vitrine.');}
function responderContrato(cid,status){
  if(!rodadaEditavel()){alert('As decisões deste mês já foram confirmadas e estão bloqueadas. Aguarde a próxima rodada.');return;}
  if(status==='recusado'){db.ref(`contratos/${cid}/status`).set('recusado');return;}
  db.ref('/').transaction(root=>{
    if(!root||!root.contratos||!root.contratos[cid])return root;const c=root.contratos[cid];if(c.status!=='pendente'&&c.status!=='bloqueado')return root;
    const comp=root.equipes?.[c.comprador],vend=root.equipes?.[c.vendedor];if(!comp||!vend)return root;safeEq(comp,c.comprador);safeEq(vend,c.vendedor);
    const qtd=Math.max(1,Number(c.qtdInsumo||0)),valor=Number(c.valor||0),programada=c.prazo==='programado',disponivel=Math.max(0,Number(vend.estoque.insumoFabricado||0)-Number(vend.estoqueReservado.insumoFabricado||0));
    if(disponivel<qtd){c.status='bloqueado';c.motivo='Vendedor sem insumo fabricado disponível';return root;}
    if(c.pagamento==='avista'&&!programada&&Number(comp.caixa||0)<valor){c.status='bloqueado';c.motivo='Comprador sem caixa para pagamento à vista';return root;}
    c.status='aceito';c.tipoInsumo='fabricado';c.qtdEntregue=0;c.financeiroExecutado=false;
    if(programada){vend.estoqueReservado.insumoFabricado+=qtd;vend.estoqueReservado.insumoFabricadoProgramado+=qtd;comp.estoqueReservado.insumoComprado+=qtd;c.entregaRodada=(root.estado?.rodada||1)+1;c.entregaExecutada=false;}
    else{vend.estoque.insumoFabricado-=qtd;comp.estoque.insumoComprado+=qtd;comp.movimentosRodada.compradoB2BImediato+=qtd;c.entregaExecutada=true;if(c.pagamento==='avista'){comp.caixa-=valor;vend.caixa+=valor;c.financeiroExecutado=true;}else{c.financeiroRodada=(root.estado?.rodada||1)+1;}}
    c.executado=Boolean(c.entregaExecutada&&c.financeiroExecutado);return root;
  },(err,committed)=>{if(err)alert('Não foi possível processar o contrato: '+err.message);else if(committed)alert('Contrato aceito. Caixa e estoque foram atualizados conforme a entrega e o pagamento.');});
}

function fabricarInsumos(){
  if(!rodadaEditavel())return alert('A rodada está bloqueada. Aguarde a próxima rodada.');
  const qtd=Math.floor(Number(document.getElementById('dec-fabrica-qtd')?.value||0));if(qtd<1)return alert('Informe uma quantidade válida para fabricar.');
  db.ref('/').transaction(root=>{const e=root?.equipes?.[usuarioAtual];if(!e||e.enviou)return;safeEq(e,usuarioAtual);const custo=qtd*CUSTO_FABRICAR_INSUMO;if(Number(e.caixa||0)<custo)return;e.caixa-=custo;e.estoque.insumoFabricado+=qtd;e.movimentosRodada.fabricacao+=qtd;e.movimentosRodada.custoFabricacao+=custo;return root;},(err,committed)=>{if(err)alert('Não foi possível fabricar os insumos: '+err.message);else if(!committed)alert('Caixa insuficiente ou rodada bloqueada para fabricar essa quantidade.');else{document.getElementById('dec-fabrica-qtd').value=1;alert(`Fabricação concluída: ${qtd} insumo(s) adicionados ao estoque.`);}});
}
function produzirProdutoAcabado(){
  if(!rodadaEditavel())return alert('A rodada está bloqueada. Aguarde a próxima rodada.');
  const qtd=Math.floor(Number(document.getElementById('dec-produz-acabado-qtd')?.value||0));if(qtd<1)return alert('Informe uma quantidade válida para produzir.');
  db.ref('/').transaction(root=>{const e=root?.equipes?.[usuarioAtual];if(!e||e.enviou)return;safeEq(e,usuarioAtual);const comprado=Number(e.estoque.insumoComprado||0),fabricadoDisponivel=Number(e.estoque.insumoFabricado||0)-Number(e.estoqueReservado.insumoFabricado||0);if(comprado<qtd||fabricadoDisponivel<qtd)return;e.estoque.insumoComprado-=qtd;e.estoque.insumoFabricado-=qtd;e.estoque.produtoAcabado+=qtd;e.movimentosRodada.producaoAcabado+=qtd;return root;},(err,committed)=>{if(err)alert('Não foi possível produzir o produto acabado: '+err.message);else if(!committed){const e=dadosGlobais?.equipes?.[usuarioAtual],comprado=Number(e?.estoque?.insumoComprado||0),fabricado=Number(e?.estoque?.insumoFabricado||0),reservado=Number(e?.estoqueReservado?.insumoFabricado||0),disponivel=Math.max(0,fabricado-reservado);alert(`Produção bloqueada para ${qtd} unidade(s). Estoque comprado disponível: ${comprado}; estoque fabricado físico: ${fabricado}; reservado para entregas B2B: ${reservado}; estoque fabricado disponível: ${disponivel}.`);}else{document.getElementById('dec-produz-acabado-qtd').value=1;alert(`Produção concluída: ${qtd} produto(s) acabado(s) adicionados ao estoque.`);}});
}
function enviarDecisao(ev){
  ev.preventDefault();if(!rodadaEditavel()){alert('As decisões deste mês já foram confirmadas e estão bloqueadas. Aguarde a próxima rodada.');return;}
  const val=id=>Number(document.getElementById(id)?.value||0),checked=id=>Boolean(document.getElementById(id)?.checked),preco=val('dec-preco'),mktPacote=val('dec-mkt-pacote'),brandingPacote=val('dec-branding-pacote'),mkt=campanhaValor(mktPacote),branding=campanhaValor(brandingPacote),qA=val('dec-compra-a'),qB=val('dec-compra-b'),delivery=checked('dec-delivery'),funcionario=checked('dec-funcionario');
  const cen=CENARIOS.find(c=>c.id==dadosGlobais.estado.cenarioId)||CENARIOS[0],eq=dadosGlobais.equipes[usuarioAtual],caixaImediato=qA*CUSTO_INSUMO_A,custoTotalEstimado=caixaImediato+mkt+branding+Number(cen.custoFixo||CUSTO_FIXO_BASE)+(funcionario?CUSTO_FUNCIONARIO:0);
  if(custoTotalEstimado>Number(eq.caixa||0)){alert('Orçamento insuficiente para compras, campanhas e custo fixo.');return;}
  if(!confirm('Confirmar decisões? Compras selecionadas e despesas da rodada serão lançadas, e os botões de fabricação/produção serão bloqueados.'))return;
  db.ref('/').transaction(root=>{const e=root?.equipes?.[usuarioAtual];if(!e||e.enviou)return;safeEq(e,usuarioAtual);e.caixa-=caixaImediato;e.comprasPendentes ||= [];if(qA>0)e.comprasPendentes.push({qtd:qA,entregaRodada:(root.estado?.rodada||1)+1,custo:CUSTO_INSUMO_A});e.enviou=true;e.decisao={preco,mktPacote,brandingPacote,mkt,branding,qA,qB,fab:0,acab:0,delivery,funcionario,aplicada:true,custoImediato:caixaImediato};return root;},(err,committed)=>{if(err)alert('Não foi possível gravar a decisão: '+err.message);else if(committed)alert('Decisão enviada. Os campos e operações desta rodada foram bloqueados.');else alert('A decisão não foi gravada porque a rodada já foi alterada.');});
}

function renderizarHistoricoAluno(hist){
  const tbody=document.querySelector('#history-table tbody'); if(!tbody)return; tbody.innerHTML=''; const labels=['Início'],caixas=[35000];
  hist.forEach(h=>{labels.push(`Mês ${h.mes}`);caixas.push(h.caixaFinal);tbody.innerHTML+=`<tr><td>Mês ${h.mes}</td><td>${money(h.receitaB2C??(h.unidades||0)*50)}</td><td>${money(h.receitaB2BAvista??0)}</td><td>${money(h.receitaB2BPrazo??0)}</td><td>${money(h.receitaB2B||0)}</td><td>${money(h.custoFixo||0)}</td><td>${money(h.custoInsumosProduzidos||0)}</td><td>${money(h.custoInsumosComprados||0)}</td><td>${money(h.custoMarketing||0)}</td><td>${money(h.custoBranding||0)}</td><td>${money(h.custoFuncionario||0)}</td><td>${money(h.custoDelivery||0)}</td><td style="color:${h.lucro>=0?'#16a34a':'#dc2626'};font-weight:bold">${money(h.lucro)}</td></tr>`;});
  const ctx=document.getElementById('financeChart')?.getContext('2d');if(!ctx)return;if(chartInstance)chartInstance.destroy();chartInstance=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'Evolução do Caixa (R$)',data:caixas,borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,.1)',fill:true,tension:.3}]}});
}

function aplicarPagamentosECompras(equipes,rodada){Object.values(equipes).forEach(eq=>{eq.caixa+=Number(eq.receberFuturo||0);const pagar=Number(eq.pagarFuturo||0);eq.caixa-=pagar;if(eq.caixa<0)eq.dividaVencida=Math.abs(eq.caixa);else eq.dividaVencida=0;eq.receberFuturo=0;eq.pagarFuturo=0;const novas=[];(eq.comprasPendentes||[]).forEach(p=>{if(Number(p.entregaRodada)<=rodada)eq.estoque.insumoComprado+=Number(p.qtd);else novas.push(p);});eq.comprasPendentes=novas;});}
function executarContratos(equipes,contratos,rodada,cen,fluxo){
  Object.values(contratos).forEach(c=>{
    if(c.status!=='aceito'||c.rodada>rodada)return;const comp=equipes[c.comprador],vend=equipes[c.vendedor];if(!comp||!vend)return;
    if(!c.entregaExecutada){if(c.prazo!=='programado'||Number(c.entregaRodada||rodada)>rodada)return;const qtd=Number(c.qtdInsumo||0);if(Number(vend.estoqueReservado.insumoFabricado||0)<qtd||Number(vend.estoque.insumoFabricado||0)<qtd)return;vend.estoqueReservado.insumoFabricado=Number(vend.estoqueReservado.insumoFabricado||0)-qtd;vend.estoqueReservado.insumoFabricadoProgramado=Math.max(0,Number(vend.estoqueReservado.insumoFabricadoProgramado||0)-qtd);vend.estoque.insumoFabricado=Number(vend.estoque.insumoFabricado||0)-qtd;comp.estoqueReservado.insumoComprado=Math.max(0,Number(comp.estoqueReservado.insumoComprado||0)-qtd);comp.estoque.insumoComprado=Number(comp.estoque.insumoComprado||0)+qtd;c.entregaExecutada=true;c.qtdEntregue=qtd;if(c.pagamento==='avista'){const valor=Number(c.valor||0);comp.caixa-=valor;vend.caixa+=valor;c.financeiroExecutado=true;fluxo[c.comprador].saidaAgora+=valor;fluxo[c.vendedor].entradaAgora+=valor;}else c.financeiroRodada=rodada;}
    if(c.pagamento==='prazo30'&&!c.financeiroExecutado&&c.financeiroRodada&&Number(c.financeiroRodada)<=rodada){const valor=Number(c.valor||0);comp.caixa-=valor;vend.caixa+=valor;c.financeiroExecutado=true;fluxo[c.comprador].saidaAgora+=valor;fluxo[c.vendedor].entradaAgora+=valor;}
    if(c.entregaExecutada&&c.financeiroExecutado){vend.contratosFechados=(vend.contratosFechados||0)+1;c.executado=true;}
  });
}
function processarRodada(){
  if(!confirm('Deseja calcular os resultados deste mês e avançar para o próximo?'))return;
  dadosGlobais=normalizar(dadosGlobais);const est=dadosGlobais.estado,cen=CENARIOS.find(c=>c.id==est.cenarioId)||CENARIOS[0];
  const equipes=JSON.parse(JSON.stringify(dadosGlobais.equipes)),contratos=JSON.parse(JSON.stringify(dadosGlobais.contratos||{}));
  Object.values(equipes).forEach(eq=>safeEq(eq,eq.id));aplicarPagamentosECompras(equipes,est.rodada+1);
  const fluxo={};Object.keys(equipes).forEach(id=>fluxo[id]={entradaAgora:0,saidaAgora:0,contratosFechados:0});executarContratos(equipes,contratos,est.rodada+1,cen,fluxo);
  const atr={},totalClientes=Math.round(DEMANDA_BASE*cen.demandaMult);let soma=0;
  Object.entries(equipes).forEach(([id,eq])=>{const d=eq.decisao||{preco:55,mkt:0,branding:0,qA:0,qB:0,fab:0,acab:0},v=valoresDecisao(d),bonusDelivery=d.delivery?4:0,bonusFuncionario=d.funcionario?3:0,contratoMult=fluxo[id].contratosFechados?cen.pesoB2B:1;const a=((PRECO_BASE/Math.max(10,Number(d.preco)))*100*cen.pesoPreco+(v.mkt/1000)*15*v.mktFator*cen.pesoMkt+((eq.branding||10)+(v.branding/1000)*5*v.brandingFator)*4*cen.pesoBranding+bonusDelivery+bonusFuncionario)*contratoMult;atr[id]=a;soma+=a;});
  const historicoRodada={};Object.entries(equipes).forEach(([id,eq])=>{const caixaInicioRodada=Number(eq.caixaAnteriorRodada??eq.caixa??0);let variacaoCaixa=0;const d=eq.decisao||{preco:55,mkt:0,branding:0,qA:0,qB:0,fab:0,acab:0},v=valoresDecisao(d),mov=eq.movimentosRodada||{fabricacao:0,custoFabricacao:0,producaoAcabado:0},contratosRodada=Object.values(contratos).filter(c=>c.rodada===est.rodada&&c.status==='aceito'),vendasB2BRodada=contratosRodada.filter(c=>c.vendedor===id),comprasB2BRodada=contratosRodada.filter(c=>c.comprador===id),receitaB2BAvista=vendasB2BRodada.filter(c=>c.pagamento==='avista').reduce((a,c)=>a+Number(c.valor||0),0),receitaB2BPrazo=vendasB2BRodada.filter(c=>c.pagamento==='prazo30').reduce((a,c)=>a+Number(c.valor||0),0),receitaB2B=receitaB2BAvista+receitaB2BPrazo,despesaB2B= comprasB2BRodada.reduce((a,c)=>a+Number(c.valor||0),0),custoCompras=Number(d.qA||0)*CUSTO_INSUMO_A+Number(d.qB||0)*CUSTO_INSUMO_B+despesaB2B,custoFab=Number(mov.custoFabricacao||0),custoProd=Number(mov.producaoAcabado||0)*CUSTO_PRODUCAO_ACABADO,custoFuncionario=d.funcionario?CUSTO_FUNCIONARIO:0;
    eq.comprasPendentes ||= [];if(!d.aplicada&&Number(d.qA||0)>0)eq.comprasPendentes.push({qtd:Number(d.qA),entregaRodada:est.rodada+1,custo:CUSTO_INSUMO_A});
    if(!d.aplicada){eq.estoque.insumoComprado+=Number(d.qB||0)-Number(d.fab||0)-Number(d.acab||0);eq.estoque.insumoFabricado+=Number(d.fab||0)-Number(d.acab||0);eq.estoque.produtoAcabado+=Number(d.acab||0);}eq.estoque.insumoComprado=Math.max(0,eq.estoque.insumoComprado);eq.estoque.insumoFabricado=Math.max(0,eq.estoque.insumoFabricado);
    const share=soma?atr[id]/soma:1/Object.keys(equipes).length,demanda=Math.round(totalClientes*share),reservadoAcabado=Number(eq.estoqueReservado.produtoAcabado||0),disponivelAcabado=Math.max(0,eq.estoque.produtoAcabado-reservadoAcabado),vendas=Math.min(demanda,disponivelAcabado),perdidas=Math.max(0,demanda-vendas),sobra=Math.max(0,disponivelAcabado-vendas),receitaB2C=vendas*Number(d.preco||55),receitaB2BCaixa=fluxo[id].entradaAgora,custoDelivery=d.delivery?vendas*CUSTO_DELIVERY:0,custoFixo=Number(cen.custoFixo||CUSTO_FIXO_BASE)+custoFuncionario,custoMarketing=v.mkt,custoBranding=v.branding,custoTotal=custoFixo+custoProd+custoFab+custoCompras+custoMarketing+custoBranding+custoDelivery+fluxo[id].saidaAgora;let lucro=0;
    const custoCaixaRodada=custoFixo+custoDelivery;eq.caixa+=receitaB2C-custoCaixaRodada;variacaoCaixa=eq.caixa-caixaInicioRodada;lucro=variacaoCaixa;eq.caixaAnteriorRodada=eq.caixa;eq.branding=(eq.branding||10)+(v.branding/1000)*5*v.brandingFator;eq.share=share*100;eq.estoque.produtoAcabado=reservadoAcabado+sobra;const estoqueInsumosValor=eq.estoque.insumoComprado*CUSTO_INSUMO_A+eq.estoque.insumoFabricado*CUSTO_FABRICAR_INSUMO,ptsFin=clamp((eq.caixa/80000)*30,0,30),ptsVendas=clamp((vendas/500)*15,0,15)+clamp((lucro/1000),0,10),ptsEstoque=clamp((estoqueInsumosValor/8000)*20,0,20),ptsProd=clamp((vendas/Math.max(1,demanda))*15,0,15),ptsB2B=clamp((fluxo[id].contratosFechados||0)*5,0,10),scoreRodada=clamp(ptsFin+ptsVendas+ptsEstoque+ptsProd+ptsB2B-clamp(sobra/100,0,5),0,100);
    eq.score=scoreRodada;eq.estrelas=Number(stars(scoreRodada));const acumulada=[...(eq.historico||[]).map(h=>Number(h.scoreRodada||0)),scoreRodada];eq.scoreAcumulado=acumulada.reduce((x,y)=>x+y,0)/acumulada.length;eq.estoque.produtoAcabado=reservadoAcabado;eq.estoqueAnteriorRodada={insumoComprado:eq.estoque.insumoComprado,insumoFabricado:eq.estoque.insumoFabricado};eq.historico ||= [];eq.historico.push({mes:est.rodada,unidades:vendas,demanda,receitaB2C,receitaB2B,receitaB2BAvista,receitaB2BPrazo,custoFixo,custoFuncionario,custoProducaoAcabado:custoProd,custoInsumosProduzidos:custoFab,custoInsumosComprados:custoCompras,custoMarketing,custoBranding,custoDelivery,estoqueInsumosValor,vendasPerdidasEstoque:perdidas,perdidasEstoque:sobra,receita:receitaB2C+receitaB2B,lucro,share:eq.share,caixaFinal:eq.caixa,scoreRodada,estrelas:eq.estrelas});eq.enviou=false;eq.decisao=null;eq.movimentosRodada={fabricacao:0,custoFabricacao:0,producaoAcabado:0,compradoFornecedorB:0,compradoB2BImediato:0};historicoRodada[id]={perdidas};
  });
  db.ref('/').set({equipes,contratos,estado:{rodada:est.rodada+1,cenarioId:est.cenarioId,aberta:true}});alert(`Mês ${est.rodada} processado. ${Object.values(historicoRodada).reduce((a,h)=>a+h.perdidas,0)} vendas potenciais foram perdidas por falta de produto acabado.`);
}
function iniciarListenerProfessor(){const select=document.getElementById('prof-scenario-select');select.innerHTML=CENARIOS.map(c=>`<option value="${c.id}">${c.nome}</option>`).join('');db.ref('/').on('value',snap=>{dadosGlobais=normalizar(snap.val()||{});const est=dadosGlobais.estado;document.getElementById('prof-round-badge').textContent=`Mês Atual: ${est.rodada} (${est.aberta?'Aberta':'Bloqueada'})`;select.value=est.cenarioId;const cen=CENARIOS.find(c=>c.id==est.cenarioId)||CENARIOS[0];document.getElementById('prof-scenario-detail').textContent=cen.desc;const sl=document.getElementById('prof-status-list'),rb=document.querySelector('#prof-ranking-table tbody');sl.innerHTML='';rb.innerHTML='';Object.values(dadosGlobais.equipes).sort((a,b)=>(b.score||0)-(a.score||0)).forEach((eq,i)=>{sl.innerHTML+=`<li><span>${eq.nome}</span><strong style="color:${eq.enviou?'#16a34a':'#d97706'}">${eq.enviou?'✅ Enviado':'⏳ Pendente'}</strong></li>`;rb.innerHTML+=`<tr><td><strong>#${i+1}</strong></td><td>${eq.nome}</td><td>${money(eq.caixa)}</td><td>${(eq.share||0).toFixed(1)}%</td><td>${Math.round(eq.branding||0)} pts</td><td><strong>${Math.round(eq.score||0)} pts</strong></td><td>${stars(eq.score||0)} ★</td><td>${eq.historico?.length?`M${eq.historico.length}`:'Aguardando'}</td></tr>`;});});}
function atualizarCenarioAtivo(){db.ref('estado/cenarioId').set(Number(document.getElementById('prof-scenario-select').value));}
function toggleStatusRodada(){db.ref('estado/aberta').set(!dadosGlobais.estado.aberta);}
function resetarJogoCompleto(){if(confirm('ATENÇÃO: Isso apagará todo o progresso, estoque e contratos e voltará ao Mês 1. Confirmar?'))db.ref('/').set(DADOS_INICIAIS);}
