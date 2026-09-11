import { useRef, type ChangeEvent } from "react";
import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";

/**
 * Hook compartilhado pra abrir a câmera do tablet/celular ao anexar foto.
 * Extraído de SATAnexoUploader.tsx (o único lugar que já fazia isso certo):
 * dois <input type="file"> ocultos — um comum, um com capture="environment"
 * — escolhidos conforme o dispositivo é touch ou não.
 */
export function useCameraCaptureInputs(
  onFiles: (files: FileList) => void,
  opts?: { multiple?: boolean; accept?: string },
) {
  const { multiple = false, accept = "image/*" } = opts ?? {};
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const isTouch = useIsTouchDevice();

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) onFiles(e.target.files);
    e.target.value = "";
  }

  function renderInputs() {
    return (
      <>
        <input
          ref={fileRef}
          type="file"
          multiple={multiple}
          accept={accept}
          className="hidden"
          onChange={handleChange}
        />
        {isTouch && (
          <input
            ref={camRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple={multiple}
            className="hidden"
            onChange={handleChange}
          />
        )}
      </>
    );
  }

  return {
    renderInputs,
    openGaleria: () => fileRef.current?.click(),
    openCamera: () => (isTouch ? camRef.current?.click() : fileRef.current?.click()),
    isTouch,
  };
}
