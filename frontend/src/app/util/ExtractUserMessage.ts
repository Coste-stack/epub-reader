export function extractUserMessage(error: unknown): string {
  const defaultMsg = "Error uploading EPUB";

  if (error instanceof Error && typeof error.message === "string") {
    // Split message into lines
    const lines = error.message.split('\n').map(line => line.trim()).filter(Boolean);

    // Try to find a line that's not SQL or a stack trace
    for (const line of lines) {
      // Heuristic: skip lines that look like SQL or technical details
      if (
        !line.match(/^\w+:/) && // skip lines like "Error:", "insert into", etc.
        !line.startsWith("at ") && // skip stack trace
        !line.match(/^\[.*\]$/) // skip bracketed technical stuff
      ) {
        // If the line is reasonably short, show it
        if (line.length > 0 && line.length < 200) {
          return line;
        }
      }
    }

    // Fallback: Try to extract the first line after the main error prefix
    if (lines.length > 1) {
      return lines[1];
    }
    
    // Fallback: Use the whole message
    return error.message;
  }

  return defaultMsg;
}