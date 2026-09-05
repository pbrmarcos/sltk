import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/**
 * Campos de SEO reusados por 3 telas que gravam em tabelas diferentes
 * (page_seo, brand_settings, equipamento_pagina) — só a apresentação é
 * compartilhada, cada chamador mantém seu próprio estado e salvamento.
 */
export function SeoFieldsCard({
  title,
  onTitleChange,
  titleMaxLength = 60,
  titleId,
  description,
  onDescriptionChange,
  descriptionMaxLength = 160,
  descriptionId,
  ogImage,
  onOgImageChange,
  ogImageId,
  showOgImagePreview = false,
  className,
}: {
  title: string;
  onTitleChange: (v: string) => void;
  titleMaxLength?: number;
  titleId?: string;
  description: string;
  onDescriptionChange: (v: string) => void;
  descriptionMaxLength?: number;
  descriptionId?: string;
  ogImage?: string;
  onOgImageChange?: (v: string) => void;
  ogImageId?: string;
  showOgImagePreview?: boolean;
  className?: string;
}) {
  return (
    <div className={className ?? "grid gap-4 sm:grid-cols-2"}>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={titleId} className="text-xs">
          Título (SEO){" "}
          <span className="ml-1 text-[10px] text-[var(--text-muted)]">
            {title.length}/{titleMaxLength}
          </span>
        </Label>
        <Input
          id={titleId}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          maxLength={titleMaxLength}
          placeholder={`Título exibido em buscadores e compartilhamento (até ${titleMaxLength} caracteres)`}
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={descriptionId} className="text-xs">
          Descrição (SEO){" "}
          <span className="ml-1 text-[10px] text-[var(--text-muted)]">
            {description.length}/{descriptionMaxLength}
          </span>
        </Label>
        <Textarea
          id={descriptionId}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={3}
          maxLength={descriptionMaxLength}
          placeholder={`Resumo exibido em buscadores (até ${descriptionMaxLength} caracteres)`}
        />
      </div>

      {onOgImageChange && (
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={ogImageId} className="text-xs">
            Imagem de compartilhamento (og:image)
          </Label>
          <Input
            id={ogImageId}
            value={ogImage ?? ""}
            onChange={(e) => onOgImageChange(e.target.value)}
            placeholder="https://.../imagem.png"
          />
          {showOgImagePreview && ogImage && (
            <img
              src={ogImage}
              alt="Prévia da imagem de compartilhamento"
              className="mt-2 max-h-40 rounded-md border border-[var(--bg-border)]"
            />
          )}
        </div>
      )}
    </div>
  );
}
