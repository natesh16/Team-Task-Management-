import React, { useState } from "react";
import Icon from "./Icon";
import { useToast } from "./Toast";
import { copyText } from "../utils/format";

export default function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  className = "btn btn-ghost btn-sm",
  iconOnly = false,
  title,
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyText(value);
    if (ok) {
      setCopied(true);
      toast.success(copiedLabel);
      setTimeout(() => setCopied(false), 1800);
    } else {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <button
      type="button"
      className={className}
      onClick={handleCopy}
      title={title || label}
      aria-label={title || label}
    >
      <Icon name={copied ? "check" : "copy"} size={15} />
      {!iconOnly && <span>{copied ? copiedLabel : label}</span>}
    </button>
  );
}
