import type { BlocoTipo } from "@/lib/equipamento-pagina.shared";
import type { IconeNome } from "@/lib/equipamento-pagina.shared";
import {
  CampoTextoIdiomas,
  CampoTextareaIdiomas,
  CampoTextoSimples,
  ListaTextosIdiomas,
  ListaEditor,
  SeletorIcone,
} from "./campos";

type Conteudo = Record<string, unknown>;
type OnChange = (next: Conteudo) => void;

function FormularioHero({ value, onChange }: { value: Conteudo; onChange: OnChange }) {
  return (
    <div className="space-y-4">
      <CampoTextoIdiomas label="Eyebrow" base="eyebrow" value={value} onChange={onChange} />
      <CampoTextoIdiomas
        label="Título"
        base="titulo"
        value={value}
        onChange={onChange}
        obrigatorio
      />
      <CampoTextareaIdiomas
        label="Subtítulo"
        base="subtitulo"
        value={value}
        onChange={onChange}
        rows={3}
      />
      <CampoTextoIdiomas
        label="Texto do botão"
        base="cta_label"
        value={value}
        onChange={onChange}
      />
      <CampoTextoSimples
        label="URL da imagem"
        field="imagem_url"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

function FormularioDescricao({ value, onChange }: { value: Conteudo; onChange: OnChange }) {
  return (
    <div className="space-y-4">
      <CampoTextoIdiomas label="Eyebrow" base="eyebrow" value={value} onChange={onChange} />
      <CampoTextoIdiomas
        label="Título"
        base="titulo"
        value={value}
        onChange={onChange}
        obrigatorio
      />
      <CampoTextareaIdiomas label="Texto" base="texto" value={value} onChange={onChange} />
      <ListaTextosIdiomas
        label="Lista de destaques (bullets)"
        base="bullets"
        value={value}
        onChange={onChange}
      />
      <CampoTextoSimples
        label="URL da imagem"
        field="imagem_url"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

function FormularioEspecificacoes({ value, onChange }: { value: Conteudo; onChange: OnChange }) {
  const itens = Array.isArray(value.itens) ? (value.itens as Conteudo[]) : [];
  return (
    <div className="space-y-4">
      <CampoTextoIdiomas label="Eyebrow" base="eyebrow" value={value} onChange={onChange} />
      <CampoTextoIdiomas
        label="Título"
        base="titulo"
        value={value}
        onChange={onChange}
        obrigatorio
      />
      <CampoTextareaIdiomas
        label="Descrição"
        base="descricao"
        value={value}
        onChange={onChange}
        rows={2}
      />
      <ListaEditor
        label="Especificações"
        itens={itens}
        onChange={(next) => onChange({ ...value, itens: next })}
        novoItem={() => ({ label_pt: "", valor_pt: "" })}
        renderItem={(item, onChangeItem) => (
          <div className="space-y-3">
            <CampoTextoIdiomas
              label="Rótulo"
              base="label"
              value={item}
              onChange={onChangeItem}
              obrigatorio
            />
            <CampoTextoIdiomas
              label="Valor"
              base="valor"
              value={item}
              onChange={onChangeItem}
              obrigatorio
            />
          </div>
        )}
      />
    </div>
  );
}

function FormularioBeneficios({ value, onChange }: { value: Conteudo; onChange: OnChange }) {
  const itens = Array.isArray(value.itens) ? (value.itens as Conteudo[]) : [];
  return (
    <div className="space-y-4">
      <CampoTextoIdiomas label="Eyebrow" base="eyebrow" value={value} onChange={onChange} />
      <CampoTextoIdiomas
        label="Título"
        base="titulo"
        value={value}
        onChange={onChange}
        obrigatorio
      />
      <CampoTextareaIdiomas
        label="Descrição"
        base="descricao"
        value={value}
        onChange={onChange}
        rows={2}
      />
      <ListaEditor
        label="Benefícios"
        itens={itens}
        onChange={(next) => onChange({ ...value, itens: next })}
        novoItem={() => ({ icone: "Sparkles", titulo_pt: "", texto_pt: "" })}
        renderItem={(item, onChangeItem) => (
          <div className="space-y-3">
            <SeletorIcone
              value={item.icone as IconeNome | undefined}
              onChange={(icone) => onChangeItem({ ...item, icone })}
            />
            <CampoTextoIdiomas
              label="Título"
              base="titulo"
              value={item}
              onChange={onChangeItem}
              obrigatorio
            />
            <CampoTextareaIdiomas
              label="Texto"
              base="texto"
              value={item}
              onChange={onChangeItem}
              rows={2}
            />
          </div>
        )}
      />
    </div>
  );
}

function FormularioCasosUso({ value, onChange }: { value: Conteudo; onChange: OnChange }) {
  const itens = Array.isArray(value.itens) ? (value.itens as Conteudo[]) : [];
  return (
    <div className="space-y-4">
      <CampoTextoIdiomas label="Eyebrow" base="eyebrow" value={value} onChange={onChange} />
      <CampoTextoIdiomas
        label="Título"
        base="titulo"
        value={value}
        onChange={onChange}
        obrigatorio
      />
      <CampoTextareaIdiomas
        label="Descrição"
        base="descricao"
        value={value}
        onChange={onChange}
        rows={2}
      />
      <ListaEditor
        label="Casos de uso"
        itens={itens}
        onChange={(next) => onChange({ ...value, itens: next })}
        novoItem={() => ({ titulo_pt: "", texto_pt: "", imagem_url: "" })}
        renderItem={(item, onChangeItem) => (
          <div className="space-y-3">
            <CampoTextoIdiomas
              label="Título"
              base="titulo"
              value={item}
              onChange={onChangeItem}
              obrigatorio
            />
            <CampoTextareaIdiomas
              label="Texto"
              base="texto"
              value={item}
              onChange={onChangeItem}
              rows={2}
              obrigatorio
            />
            <CampoTextoSimples
              label="URL da imagem"
              field="imagem_url"
              value={item}
              onChange={onChangeItem}
            />
          </div>
        )}
      />
    </div>
  );
}

function FormularioGaleria({ value, onChange }: { value: Conteudo; onChange: OnChange }) {
  const imagens = Array.isArray(value.imagens) ? (value.imagens as Conteudo[]) : [];
  return (
    <div className="space-y-4">
      <CampoTextoIdiomas label="Título da seção" base="titulo" value={value} onChange={onChange} />
      <ListaEditor
        label="Imagens"
        itens={imagens}
        onChange={(next) => onChange({ ...value, imagens: next })}
        novoItem={() => ({ url: "", alt_pt: "" })}
        renderItem={(item, onChangeItem) => (
          <div className="space-y-3">
            <CampoTextoSimples
              label="URL da imagem"
              field="url"
              value={item}
              onChange={onChangeItem}
            />
            <CampoTextoSimples
              label="Legenda (opcional)"
              field="alt_pt"
              value={item}
              onChange={onChangeItem}
            />
          </div>
        )}
      />
    </div>
  );
}

function FormularioFaq({ value, onChange }: { value: Conteudo; onChange: OnChange }) {
  const itens = Array.isArray(value.itens) ? (value.itens as Conteudo[]) : [];
  return (
    <div className="space-y-4">
      <CampoTextoIdiomas label="Título da seção" base="titulo" value={value} onChange={onChange} />
      <ListaEditor
        label="Perguntas"
        itens={itens}
        onChange={(next) => onChange({ ...value, itens: next })}
        novoItem={() => ({ pergunta_pt: "", resposta_pt: "" })}
        renderItem={(item, onChangeItem) => (
          <div className="space-y-3">
            <CampoTextoIdiomas
              label="Pergunta"
              base="pergunta"
              value={item}
              onChange={onChangeItem}
              obrigatorio
            />
            <CampoTextareaIdiomas
              label="Resposta"
              base="resposta"
              value={item}
              onChange={onChangeItem}
              rows={2}
              obrigatorio
            />
          </div>
        )}
      />
    </div>
  );
}

function FormularioVideo({ value, onChange }: { value: Conteudo; onChange: OnChange }) {
  return (
    <div className="space-y-4">
      <CampoTextoIdiomas label="Título da seção" base="titulo" value={value} onChange={onChange} />
      <CampoTextoSimples
        label="URL do vídeo (YouTube ou Vimeo)"
        field="url"
        value={value}
        onChange={onChange}
        placeholder="https://www.youtube.com/watch?v=..."
      />
    </div>
  );
}

function FormularioCtaOrcamento({ value, onChange }: { value: Conteudo; onChange: OnChange }) {
  return (
    <div className="space-y-4">
      <CampoTextoIdiomas
        label="Título"
        base="titulo"
        value={value}
        onChange={onChange}
        obrigatorio
      />
      <CampoTextareaIdiomas
        label="Subtítulo"
        base="subtitulo"
        value={value}
        onChange={onChange}
        rows={2}
      />
      <CampoTextoIdiomas
        label="Texto do botão"
        base="cta_label"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

/** Dispatcher: um formulário estruturado por tipo de bloco. */
export function BlocoFormulario({
  tipo,
  value,
  onChange,
}: {
  tipo: BlocoTipo;
  value: Conteudo;
  onChange: OnChange;
}) {
  switch (tipo) {
    case "hero":
      return <FormularioHero value={value} onChange={onChange} />;
    case "descricao":
      return <FormularioDescricao value={value} onChange={onChange} />;
    case "especificacoes":
      return <FormularioEspecificacoes value={value} onChange={onChange} />;
    case "beneficios":
      return <FormularioBeneficios value={value} onChange={onChange} />;
    case "casos_uso":
      return <FormularioCasosUso value={value} onChange={onChange} />;
    case "galeria":
      return <FormularioGaleria value={value} onChange={onChange} />;
    case "faq":
      return <FormularioFaq value={value} onChange={onChange} />;
    case "video":
      return <FormularioVideo value={value} onChange={onChange} />;
    case "cta_orcamento":
      return <FormularioCtaOrcamento value={value} onChange={onChange} />;
    default:
      return null;
  }
}
