import { Fragment } from "react";
import { CoinIcon } from "./GameIcons";

/** Moneda dorada en línea con el texto (el emoji 🪙 sale gris en Windows y muchos Android) */
export function InlineCoin({ className = "" }: { className?: string }) {
  return <CoinIcon size={18} className={`inline-block h-[1.1em] w-[1.1em] align-[-0.2em] ${className}`} />;
}

/** Muestra un texto cambiando cada 🪙 por la moneda dorada de la app */
export function CoinText({ text }: { text: string }) {
  if (!text.includes("🪙")) return <>{text}</>;
  const parts = text.split("🪙");
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p}
          {i < parts.length - 1 && <InlineCoin />}
        </Fragment>
      ))}
    </>
  );
}
