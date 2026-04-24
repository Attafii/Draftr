# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: draftr.spec.ts >> allows PDF annotations on the rendered page
- Location: tests\e2e\draftr.spec.ts:151:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: getByTestId('pdf-editor-title')
Expected: "Native PDF editor"
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" with timeout 15000ms
  - waiting for getByTestId('pdf-editor-title')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]:
          - paragraph [ref=e8]: Conversion workspace
          - generic [ref=e9]:
            - img [ref=e10]
            - generic [ref=e13]: annotate.pdf
        - generic [ref=e14]:
          - button "Clean PDF" [ref=e15] [cursor=pointer]:
            - img [ref=e16]
            - text: Clean PDF
          - button "Print PDF" [ref=e19] [cursor=pointer]:
            - img [ref=e20]
            - text: Print PDF
          - button "Normalized MD" [ref=e23] [cursor=pointer]:
            - img [ref=e24]
            - text: Normalized MD
          - button "AI insight" [ref=e27] [cursor=pointer]:
            - img [ref=e28]
            - text: AI insight
          - button "Reset" [ref=e31] [cursor=pointer]:
            - img [ref=e32]
            - text: Reset
      - generic [ref=e35]:
        - generic [ref=e36]:
          - generic [ref=e37]:
            - img [ref=e38]
            - generic [ref=e41]: PDF editor
          - generic [ref=e43]:
            - generic [ref=e44]:
              - generic [ref=e45]:
                - generic [ref=e46]:
                  - img [ref=e47]
                  - generic [ref=e50]: Native PDF editor
                - paragraph [ref=e51]: annotate.pdf
                - paragraph [ref=e52]: Edit the extracted text, annotate pages, and export a revised PDF
              - generic [ref=e53]:
                - img [ref=e54]
                - generic [ref=e58]: 877 B
            - generic [ref=e59]:
              - generic [ref=e60]:
                - generic [ref=e61]:
                  - button "Pages" [ref=e62] [cursor=pointer]:
                    - img [ref=e63]
                    - text: Pages
                  - button "Text" [ref=e67] [cursor=pointer]:
                    - img [ref=e68]
                    - text: Text
                - generic [ref=e70]:
                  - button "Zoom out" [ref=e71] [cursor=pointer]:
                    - img [ref=e72]
                    - text: Zoom out
                  - generic [ref=e74]: 118%
                  - button "Zoom in" [ref=e75] [cursor=pointer]:
                    - text: Zoom in
                    - img [ref=e76]
              - generic [ref=e78]: Object.defineProperty called on non-object
              - generic [ref=e79]:
                - generic [ref=e80]: Object.defineProperty called on non-object
                - generic [ref=e83]: Hello annotation world -- 1 of 1 --
                - generic [ref=e84]:
                  - generic [ref=e85]: Page 1 of 1
                  - generic [ref=e86]: 0 annotations
              - generic [ref=e87]:
                - generic [ref=e88]:
                  - generic [ref=e89]:
                    - paragraph [ref=e90]: Annotation tools
                    - paragraph [ref=e91]: Select text in the active page, then save a highlight, underline, or note.
                  - button "Clear" [disabled] [ref=e92]:
                    - img [ref=e93]
                    - text: Clear
                - generic [ref=e96]:
                  - button "Highlight" [ref=e97] [cursor=pointer]:
                    - img [ref=e98]
                    - text: Highlight
                  - button "Underline" [ref=e101] [cursor=pointer]:
                    - img [ref=e102]
                    - text: Underline
                  - button "Note" [ref=e104] [cursor=pointer]:
                    - img [ref=e105]
                    - text: Note
                - generic [ref=e109]:
                  - generic [ref=e110]:
                    - generic [ref=e111]: Note text
                    - textbox "Note text" [ref=e112]:
                      - /placeholder: Write a note for comment annotations.
                  - generic [ref=e113]:
                    - generic [ref=e114]:
                      - paragraph [ref=e115]: Selection status
                      - paragraph [ref=e116]: Select text on the active page to create an annotation.
                    - button "Save annotation" [disabled] [ref=e117]
        - generic [ref=e119]:
          - generic [ref=e120]:
            - img [ref=e121]
            - generic [ref=e124]: Right panel output
          - generic [ref=e125]:
            - generic [ref=e126]:
              - generic [ref=e127]:
                - paragraph [ref=e128]: Rendered output
                - paragraph [ref=e129]: Live PDF text preview
              - generic [ref=e130]: Live conversion
            - generic [ref=e132]: Hello annotation world -- 1 of 1 --
  - button "Open Next.js Dev Tools" [ref=e138] [cursor=pointer]:
    - img [ref=e139]
  - alert [ref=e142]
```

# Test source

```ts
  62  |     page,
  63  |     '[data-testid="magic-upload-input"]',
  64  |     "draft.md",
  65  |     "text/markdown",
  66  |     await createMarkdownBuffer(),
  67  |   );
  68  | 
  69  |   await expect(page.getByText("Conversion workspace")).toBeVisible();
  70  |   await expect(page.getByTestId("workspace-header-file-name")).toHaveText("draft.md");
  71  | 
  72  |   const editor = page.locator('textarea[placeholder="Write or refine markdown here. The preview updates live."]');
  73  |   await expect(editor).toHaveValue("# Draft Title\n\nFirst paragraph.\n\nSecond line.");
  74  | 
  75  |   const download = await waitForDownload(page, () => page.getByRole("button", { name: "Normalized MD" }).click());
  76  |   expect(download.suggestedFilename()).toBe("draft-converted.md");
  77  | 
  78  |   const downloadPath = await download.path();
  79  | 
  80  |   if (!downloadPath) {
  81  |     throw new Error("Expected a download path for the markdown export.");
  82  |   }
  83  | 
  84  |   const exportedMarkdown = await readFile(downloadPath, "utf8");
  85  |   expect(exportedMarkdown).toBe("# Draft Title\n\nFirst paragraph.\n\nSecond line.\n");
  86  | });
  87  | 
  88  | test("rewrites markdown through the AI sidebar and exports a PDF", async ({ page }) => {
  89  |   await page.goto("/");
  90  | 
  91  |   await uploadFile(
  92  |     page,
  93  |     '[data-testid="magic-upload-input"]',
  94  |     "rewrite.md",
  95  |     "text/markdown",
  96  |     Buffer.from("# Rewrite Draft\n\n\nA  paragraph with   extra spacing.\n", "utf8"),
  97  |   );
  98  | 
  99  |   await page.getByRole("button", { name: "AI insight" }).click();
  100 |   await expect(page.getByTestId("ai-sidebar-title")).toHaveText("AI Insight");
  101 | 
  102 |   await page.getByRole("button", { name: "Enhance file" }).click();
  103 | 
  104 |   const editor = page.locator('textarea[placeholder="Write or refine markdown here. The preview updates live."]');
  105 |   await expect(editor).toHaveValue("# Rewrite Draft\n\nA paragraph with extra spacing.");
  106 | 
  107 |   await page.getByRole("button", { name: "Close" }).click();
  108 | 
  109 |   const download = await waitForDownload(page, () => page.getByRole("button", { name: "Clean PDF" }).click());
  110 |   expect(download.suggestedFilename()).toBe("rewrite-converted.pdf");
  111 | 
  112 |   const downloadPath = await download.path();
  113 | 
  114 |   if (!downloadPath) {
  115 |     throw new Error("Expected a download path for the PDF export.");
  116 |   }
  117 | 
  118 |   const pdfBytes = await readFile(downloadPath);
  119 |   expect(pdfBytes.subarray(0, 4).toString("utf8")).toBe("%PDF");
  120 | });
  121 | 
  122 | test("runs OCR on an image through the tool suite", async ({ page }) => {
  123 |   await page.goto("/");
  124 | 
  125 |   await page.getByRole("button", { name: "Browse tools" }).click();
  126 |   await page.getByRole("button", { name: "OCR PDF" }).click();
  127 | 
  128 |   await uploadFile(
  129 |     page,
  130 |     '[data-testid="tool-suite-file-input"]',
  131 |     "ocr-browser-test.svg",
  132 |     "image/svg+xml",
  133 |     createSvgBuffer(),
  134 |   );
  135 | 
  136 |   const download = await waitForDownload(page, () => page.getByRole("button", { name: "Run tool" }).click());
  137 |   expect(download.suggestedFilename()).toBe("ocr-browser-test-converted.md");
  138 | 
  139 |   const downloadPath = await download.path();
  140 | 
  141 |   if (!downloadPath) {
  142 |     throw new Error("Expected a download path for the OCR markdown export.");
  143 |   }
  144 | 
  145 |   const recognizedText = await readFile(downloadPath, "utf8");
  146 |   expect(recognizedText).toContain("OCR browser test");
  147 |   expect(recognizedText).toContain("recognized text");
  148 |   await expect(page.getByText("OCR extracted text from ocr-browser-test.svg.")).toBeVisible();
  149 | });
  150 | 
  151 | test("allows PDF annotations on the rendered page", async ({ page }) => {
  152 |   await page.goto("/");
  153 | 
  154 |   await uploadFile(
  155 |     page,
  156 |     '[data-testid="magic-upload-input"]',
  157 |     "annotate.pdf",
  158 |     "application/pdf",
  159 |     await createPdfBuffer(),
  160 |   );
  161 | 
> 162 |   await expect(page.getByTestId("pdf-editor-title")).toHaveText("Native PDF editor");
      |                                                      ^ Error: expect(locator).toHaveText(expected) failed
  163 | 
  164 |   const pdfSurface = page.getByTestId("pdf-page-surface");
  165 |   await expect(pdfSurface.getByText("Hello annotation world")).toBeVisible();
  166 | 
  167 |   const selectionCreated = await pdfSurface.evaluate((container, targetText) => {
  168 |     const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  169 |     let currentNode = walker.nextNode();
  170 | 
  171 |     while (currentNode) {
  172 |       const textNode = currentNode as Text;
  173 |       const textContent = textNode.textContent ?? "";
  174 |       const matchIndex = textContent.indexOf(targetText as string);
  175 | 
  176 |       if (matchIndex >= 0) {
  177 |         const range = document.createRange();
  178 |         range.setStart(textNode, matchIndex);
  179 |         range.setEnd(textNode, matchIndex + (targetText as string).length);
  180 | 
  181 |         const selection = window.getSelection();
  182 |         selection?.removeAllRanges();
  183 |         selection?.addRange(range);
  184 |         container.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
  185 |         return true;
  186 |       }
  187 | 
  188 |       currentNode = walker.nextNode();
  189 |     }
  190 | 
  191 |     return false;
  192 |   }, "Hello annotation world");
  193 | 
  194 |   if (!selectionCreated) {
  195 |     throw new Error("Unable to create a PDF text selection.");
  196 |   }
  197 | 
  198 |   await expect(page.getByText("Selected text:")).toBeVisible();
  199 |   await page.getByRole("button", { name: "Highlight" }).click();
  200 |   await page.getByRole("button", { name: "Save annotation" }).click();
  201 | 
  202 |   await expect(page.getByText("Annotation history")).toBeVisible();
  203 |   await expect(page.getByTestId("pdf-annotation-history").getByRole("button", { name: /highlight/i })).toBeVisible();
  204 | });
```