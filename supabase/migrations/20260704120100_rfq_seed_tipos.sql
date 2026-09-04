-- Seed dos tipos iniciais de formulário RFQ.
-- 1) Empacotamento Termoformado — 100% derivado do checklist real.
-- 2..5) Envasadora Linear / Rotuladora / Paletizadora / Checkweigher — stubs plausíveis a corrigir.

-- Helper para (re)aplicar um tipo idempotentemente.
INSERT INTO public.rfq_formulario_tipo (codigo, nome_pt, nome_es, nome_en, familia, descricao, campos_schema)
VALUES (
  'empacotamento_termoformado',
  'Empacotamento — Carga Termoformada e Termoselada',
  'Empaquetado — Carga Termoformada y Termoselada',
  'Packaging — Thermoformed and Heat-Sealed Load',
  'empacotamento',
  'Check-list de dimensionamento de empacotadora com carga termoformada e termoselada.',
  $json$
{
  "secoes": [
    {"id":"produto","titulo":{"pt":"Produto","es":"Producto","en":"Product"},"campos":[
      {"id":"forma","tipo":"select","label":{"pt":"Forma","es":"Forma","en":"Form"},"opcoes":["Granel","Caixa","Bandeja"]},
      {"id":"gera_po","tipo":"boolean","label":{"pt":"Gera pó / compacta?","es":"¿Genera polvo / compacta?","en":"Generates dust / compacts?"}},
      {"id":"umidade","tipo":"text","label":{"pt":"Umidade","es":"Humedad","en":"Moisture"}},
      {"id":"temperatura_empacotamento","tipo":"text","label":{"pt":"Temperatura de empacotamento","es":"Temperatura de empaquetado","en":"Packaging temperature"}},
      {"id":"densidade","tipo":"text","label":{"pt":"Densidade","es":"Densidad","en":"Density"}}
    ]},
    {"id":"caracteristicas","titulo":{"pt":"Características","es":"Características","en":"Specifications"},"campos":[
      {"id":"numero_maquinas","tipo":"numero","label":{"pt":"Nº de máquinas requeridas","es":"N° de máquinas requeridas","en":"Number of machines required"}},
      {"id":"tipo_dosador","tipo":"select","label":{"pt":"Tipo de dosador","es":"Tipo de dosificador","en":"Doser type"},"opcoes":["Manual","De linha existente","Multicabeçote"]},
      {"id":"necessita_elevador","tipo":"boolean","label":{"pt":"Necessita elevador / feeder?","es":"¿Necesita elevador / feeder?","en":"Requires elevator / feeder?"}},
      {"id":"existe_tulha","tipo":"boolean","label":{"pt":"Já existe tulha de armazenagem?","es":"¿Ya existe tolva de almacenaje?","en":"Existing storage hopper?"}},
      {"id":"temperatura_ambiente","tipo":"text","label":{"pt":"Temperatura do ambiente de instalação","es":"Temperatura del ambiente de instalación","en":"Ambient temperature at installation"}},
      {"id":"produto_padronizado","tipo":"boolean","label":{"pt":"Produto é padronizado? Compacta nas paredes?","es":"¿Producto estandarizado? ¿Compacta en las paredes?","en":"Standardized product? Compacts on walls?"}},
      {"id":"necessita_limpeza","tipo":"boolean","label":{"pt":"Necessita algum tipo de limpeza final?","es":"¿Requiere limpieza final?","en":"Requires final cleaning?"}},
      {"id":"apresentacao","tipo":"long_text","label":{"pt":"Apresentação (peso, quantidade de produtos, etc.)","es":"Presentación (peso, cantidad de productos, etc.)","en":"Presentation (weight, quantity, etc.)"}},
      {"id":"tipo_pacote","tipo":"text","label":{"pt":"Tipo de pacote","es":"Tipo de paquete","en":"Package type"}},
      {"id":"formato_organizacao","tipo":"long_text","label":{"pt":"Formato / organização interna","es":"Formato / organización interna","en":"Format / internal arrangement"}},
      {"id":"medidas_bobina","tipo":"text","label":{"pt":"Medidas da bobina (compr. x larg.)","es":"Medidas de la bobina (largo x ancho)","en":"Roll size (length x width)"}},
      {"id":"tipo_filme","tipo":"text","label":{"pt":"Tipo de filme (composição)","es":"Tipo de film (composición)","en":"Film type (composition)"}},
      {"id":"tipo_solda","tipo":"select","label":{"pt":"Tipo de solda","es":"Tipo de sello","en":"Seal type"},"opcoes":["Lisa","Raiada"]},
      {"id":"solda_metodo","tipo":"select","label":{"pt":"Solda por impulso ou calor constante (barra quente)?","es":"¿Sellado por impulso o calor constante (barra caliente)?","en":"Impulse or constant-heat sealing (hot bar)?"},"opcoes":["Impulso","Calor constante"]},
      {"id":"producao_requerida","tipo":"text","label":{"pt":"Produção requerida","es":"Producción requerida","en":"Required output"}},
      {"id":"perfurador_display","tipo":"boolean","label":{"pt":"Necessita perfurador display?","es":"¿Requiere perforador display?","en":"Requires display perforator?"}},
      {"id":"empacotamento_final","tipo":"select","label":{"pt":"Empacotamento final","es":"Empaquetado final","en":"Final packaging"},"opcoes":["Caixa","Granel","Fardo","Multipack"]},
      {"id":"filme_termoencolhivel","tipo":"boolean","label":{"pt":"Necessita filme termoencolhível no final de linha?","es":"¿Necesita film termoretráctil al final de línea?","en":"Requires heat-shrink film at end of line?"}},
      {"id":"tipo_fechador","tipo":"select","label":{"pt":"Tipo de fechador (marcação)","es":"Tipo de marcador","en":"Coder type"},"opcoes":["HotStamp","Ink-jet","Termotransferência","Nenhum"]},
      {"id":"etiqueta_final","tipo":"boolean","label":{"pt":"Aplica etiqueta no pacote final?","es":"¿Aplica etiqueta al paquete final?","en":"Applies label on final package?"}}
    ]},
    {"id":"eletrica","titulo":{"pt":"Elétrica e ambiente","es":"Eléctrica y ambiente","en":"Electrical & environment"},"campos":[
      {"id":"tensao","tipo":"select","label":{"pt":"Tensão de entrada","es":"Tensión de entrada","en":"Input voltage"},"opcoes":["220V","380V","440V"]},
      {"id":"norma_antiexplosao","tipo":"text","label":{"pt":"Alguma norma anti-explosão?","es":"¿Alguna norma anti-explosión?","en":"Anti-explosion standard?"}},
      {"id":"nivel_ip","tipo":"select","label":{"pt":"Isolamento / nível IP","es":"Aislamiento / grado IP","en":"IP rating"},"opcoes":["IP55","IP65","IP67","IP69K","Outro"]},
      {"id":"fase","tipo":"select","label":{"pt":"Monofásico ou trifásico","es":"Monofásico o trifásico","en":"Single-phase or three-phase"},"opcoes":["Monofásico","Trifásico"]},
      {"id":"frequencia","tipo":"select","label":{"pt":"Frequência","es":"Frecuencia","en":"Frequency"},"opcoes":["50 Hz","60 Hz"]},
      {"id":"material_estrutura","tipo":"select","label":{"pt":"Material da estrutura","es":"Material de la estructura","en":"Frame material"},"opcoes":["Aço carbono","Inox"]}
    ]},
    {"id":"observacoes","titulo":{"pt":"Observações e fotos","es":"Observaciones y fotos","en":"Notes & photos"},"campos":[
      {"id":"observacoes","tipo":"long_text","label":{"pt":"Observações adicionais","es":"Observaciones adicionales","en":"Additional notes"}},
      {"id":"fotos","tipo":"anexo_multiplo","label":{"pt":"Fotos do produto — entrada e embalado (obrigatório)","es":"Fotos del producto — entrada y embalado (obligatorio)","en":"Photos of product — inlet and packaged (required)"}}
    ]}
  ]
}
$json$::jsonb
)
ON CONFLICT (codigo) DO UPDATE SET
  nome_pt = EXCLUDED.nome_pt,
  nome_es = EXCLUDED.nome_es,
  nome_en = EXCLUDED.nome_en,
  familia = EXCLUDED.familia,
  descricao = EXCLUDED.descricao,
  campos_schema = EXCLUDED.campos_schema,
  updated_at = now();

-- Stubs (para os outros arquétipos — cliente vai refinar depois).
INSERT INTO public.rfq_formulario_tipo (codigo, nome_pt, nome_es, nome_en, familia, campos_schema) VALUES
('envasadora_linear','Envasadora Linear','Llenadora Lineal','Linear Filler','envase',
 $j$
 {"secoes":[
   {"id":"produto","titulo":{"pt":"Produto","es":"Producto","en":"Product"},"campos":[
     {"id":"viscosidade","tipo":"select","label":{"pt":"Viscosidade","es":"Viscosidad","en":"Viscosity"},"opcoes":["Baixa","Média","Alta"]},
     {"id":"volume","tipo":"text","label":{"pt":"Volume por frasco (mL)","es":"Volumen por envase (mL)","en":"Volume per bottle (mL)"}},
     {"id":"temperatura","tipo":"text","label":{"pt":"Temperatura de envase","es":"Temperatura de llenado","en":"Filling temperature"}}
   ]},
   {"id":"producao","titulo":{"pt":"Produção","es":"Producción","en":"Output"},"campos":[
     {"id":"capacidade","tipo":"text","label":{"pt":"Capacidade nominal (frascos/h)","es":"Capacidad nominal (envases/h)","en":"Rated output (bottles/h)"}},
     {"id":"num_bicos","tipo":"numero","label":{"pt":"Número de bicos","es":"Número de boquillas","en":"Number of nozzles"}}
   ]},
   {"id":"eletrica","titulo":{"pt":"Elétrica","es":"Eléctrica","en":"Electrical"},"campos":[
     {"id":"tensao","tipo":"select","label":{"pt":"Tensão","es":"Tensión","en":"Voltage"},"opcoes":["220V","380V","440V"]},
     {"id":"fase","tipo":"select","label":{"pt":"Fase","es":"Fase","en":"Phase"},"opcoes":["Monofásico","Trifásico"]}
   ]},
   {"id":"observacoes","titulo":{"pt":"Observações","es":"Observaciones","en":"Notes"},"campos":[
     {"id":"observacoes","tipo":"long_text","label":{"pt":"Notas","es":"Notas","en":"Notes"}},
     {"id":"fotos","tipo":"anexo_multiplo","label":{"pt":"Fotos","es":"Fotos","en":"Photos"}}
   ]}
 ]}$j$::jsonb),
('rotuladora','Rotuladora','Etiquetadora','Labeler','rotulagem',
 $j$
 {"secoes":[
   {"id":"produto","titulo":{"pt":"Produto","es":"Producto","en":"Product"},"campos":[
     {"id":"formato","tipo":"select","label":{"pt":"Formato do frasco","es":"Formato del envase","en":"Bottle shape"},"opcoes":["Cilíndrico","Retangular","Oval"]},
     {"id":"altura","tipo":"text","label":{"pt":"Altura do frasco (mm)","es":"Altura del envase (mm)","en":"Bottle height (mm)"}}
   ]},
   {"id":"rotulo","titulo":{"pt":"Rótulo","es":"Etiqueta","en":"Label"},"campos":[
     {"id":"tipo_rotulo","tipo":"select","label":{"pt":"Tipo","es":"Tipo","en":"Type"},"opcoes":["Autoadesivo","Cola quente","Sleeve"]}
   ]},
   {"id":"observacoes","titulo":{"pt":"Observações","es":"Observaciones","en":"Notes"},"campos":[
     {"id":"fotos","tipo":"anexo_multiplo","label":{"pt":"Fotos","es":"Fotos","en":"Photos"}}
   ]}
 ]}$j$::jsonb),
('paletizadora','Paletizadora','Paletizadora','Palletizer','paletizacao',
 $j$
 {"secoes":[
   {"id":"produto","titulo":{"pt":"Produto","es":"Producto","en":"Product"},"campos":[
     {"id":"peso_caixa","tipo":"text","label":{"pt":"Peso por caixa (kg)","es":"Peso por caja (kg)","en":"Weight per case (kg)"}},
     {"id":"dimensao_caixa","tipo":"text","label":{"pt":"Dimensões da caixa (mm)","es":"Dimensiones de la caja (mm)","en":"Case dimensions (mm)"}}
   ]},
   {"id":"palete","titulo":{"pt":"Palete","es":"Palet","en":"Pallet"},"campos":[
     {"id":"padrao_palete","tipo":"text","label":{"pt":"Padrão do palete","es":"Estándar del palet","en":"Pallet standard"}}
   ]},
   {"id":"observacoes","titulo":{"pt":"Observações","es":"Observaciones","en":"Notes"},"campos":[
     {"id":"fotos","tipo":"anexo_multiplo","label":{"pt":"Fotos","es":"Fotos","en":"Photos"}}
   ]}
 ]}$j$::jsonb),
('checkweigher','Checkweigher','Chequeadora de peso','Checkweigher','inspecao',
 $j$
 {"secoes":[
   {"id":"produto","titulo":{"pt":"Produto","es":"Producto","en":"Product"},"campos":[
     {"id":"peso_alvo","tipo":"text","label":{"pt":"Peso alvo (g)","es":"Peso objetivo (g)","en":"Target weight (g)"}},
     {"id":"tolerancia","tipo":"text","label":{"pt":"Tolerância (g)","es":"Tolerancia (g)","en":"Tolerance (g)"}}
   ]},
   {"id":"linha","titulo":{"pt":"Linha","es":"Línea","en":"Line"},"campos":[
     {"id":"velocidade","tipo":"text","label":{"pt":"Velocidade (pcs/min)","es":"Velocidad (pzs/min)","en":"Speed (pcs/min)"}}
   ]},
   {"id":"observacoes","titulo":{"pt":"Observações","es":"Observaciones","en":"Notes"},"campos":[
     {"id":"fotos","tipo":"anexo_multiplo","label":{"pt":"Fotos","es":"Fotos","en":"Photos"}}
   ]}
 ]}$j$::jsonb)
ON CONFLICT (codigo) DO NOTHING;
