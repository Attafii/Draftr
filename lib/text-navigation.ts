export function focusTextareaLine(textarea: HTMLTextAreaElement | null, text: string, lineNumber: number): void {
  if (!textarea || lineNumber < 1) {
    return;
  }

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const safeLineNumber = Math.min(Math.max(lineNumber, 1), lines.length || 1);

  let startIndex = 0;

  for (let index = 0; index < safeLineNumber - 1; index += 1) {
    startIndex += lines[index]?.length ?? 0;
    startIndex += 1;
  }

  const targetLine = lines[safeLineNumber - 1] ?? "";
  const endIndex = startIndex + targetLine.length;

  textarea.focus();
  textarea.setSelectionRange(startIndex, endIndex);

  const computedStyle = window.getComputedStyle(textarea);
  const lineHeight = Number.parseFloat(computedStyle.lineHeight || "0") || 24;
  textarea.scrollTop = Math.max((safeLineNumber - 1) * lineHeight - lineHeight * 2, 0);
}
