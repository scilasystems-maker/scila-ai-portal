// Simple email parser — extract html, text and attachments from raw MIME source

function decodeQP(str: string): string {
  return str.replace(/=\r?\n/g, "").replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function cleanTrailingBoundary(body: string): string {
  // Remove trailing boundary markers without using /s flag
  const lines = body.split("\r\n");
  const cleaned: string[] = [];
  for (const line of lines) {
    if (line.startsWith("--")) break;
    cleaned.push(line);
  }
  return cleaned.join("\r\n").trim();
}

function decodeBody(body: string, encoding: string): string {
  if (encoding === "base64") {
    try { return Buffer.from(body.replace(/\s/g, ""), "base64").toString("utf-8"); } catch { return body; }
  }
  if (encoding === "quoted-printable") return decodeQP(body);
  return body;
}

export function simpleParseEmail(source: string): {
  html: string; text: string;
  attachments: { filename: string; contentType: string; size: number }[];
} {
  let html = "", text = "";
  const attachments: { filename: string; contentType: string; size: number }[] = [];

  const ctMatch = source.match(/Content-Type:\s*multipart\/[^;]+;\s*boundary="?([^\s"]+)"?/i);

  if (ctMatch) {
    const boundary = ctMatch[1];
    const parts = source.split("--" + boundary);
    for (const part of parts) {
      if (part.trim() === "--" || part.trim() === "") continue;
      const headerEnd = part.indexOf("\r\n\r\n");
      if (headerEnd === -1) continue;
      const headers = part.substring(0, headerEnd);
      const rawBody = part.substring(headerEnd + 4);
      const body = cleanTrailingBoundary(rawBody);
      const contentType = headers.match(/Content-Type:\s*([^\s;]+)/i)?.[1] || "";
      const isAttachment = /Content-Disposition:\s*attachment/i.test(headers);
      const filenameMatch = headers.match(/filename="?([^";\r\n]+)"?/i);
      const encoding = headers.match(/Content-Transfer-Encoding:\s*(\S+)/i)?.[1]?.toLowerCase() || "";
      const decoded = decodeBody(body, encoding);

      if (isAttachment || filenameMatch) {
        attachments.push({ filename: filenameMatch?.[1] || "attachment", contentType, size: body.length });
      } else if (contentType.includes("text/html") && !html) {
        html = decoded;
      } else if (contentType.includes("text/plain") && !text) {
        text = decoded;
      }

      // Nested multipart
      const nestedBoundary = headers.match(/boundary="?([^\s"]+)"?/i);
      if (nestedBoundary) {
        const nestedParts = body.split("--" + nestedBoundary[1]);
        for (const np of nestedParts) {
          if (np.trim() === "--" || np.trim() === "") continue;
          const nhe = np.indexOf("\r\n\r\n");
          if (nhe === -1) continue;
          const nh = np.substring(0, nhe);
          const nRawBody = np.substring(nhe + 4);
          const nb = cleanTrailingBoundary(nRawBody);
          const nCt = nh.match(/Content-Type:\s*([^\s;]+)/i)?.[1] || "";
          const nEnc = nh.match(/Content-Transfer-Encoding:\s*(\S+)/i)?.[1]?.toLowerCase() || "";
          const nDecoded = decodeBody(nb, nEnc);
          if (nCt.includes("text/html") && !html) html = nDecoded;
          else if (nCt.includes("text/plain") && !text) text = nDecoded;
        }
      }
    }
  } else {
    const headerEnd = source.indexOf("\r\n\r\n");
    if (headerEnd !== -1) {
      const headers = source.substring(0, headerEnd);
      const body = source.substring(headerEnd + 4);
      const ct = headers.match(/Content-Type:\s*([^\s;]+)/i)?.[1] || "text/plain";
      const enc = headers.match(/Content-Transfer-Encoding:\s*(\S+)/i)?.[1]?.toLowerCase() || "";
      const decoded = decodeBody(body, enc);
      if (ct.includes("html")) html = decoded; else text = decoded;
    } else {
      text = source;
    }
  }
  return { html, text, attachments };
}
