import { Fragment } from "react"

export function MessageBubbleContentText({ text }: { text: string }) {
  if (!text) return null // Return null if the text is empty

  const urlRegex = /(https?:\/\/[^\s]+)/g // Regex to match URLs
  const parts = text.split(urlRegex) // Split the text into parts using the URL regex

  // Function to render text with newlines preserved
  const renderTextWithNewlines = (content: string, keyPrefix: string) => {
    const lines = content.split('\n')
    return lines.map((line, lineIndex) => (
      <Fragment key={`${keyPrefix}-line-${lineIndex}`}>
        {line}
        {lineIndex < lines.length - 1 && <br />}
      </Fragment>
    ))
  }

  // Map over each part to render it as either plain text or an anchor tag
  return (
    <p className="p-2 whitespace-pre-wrap">
      {parts.map((part, index) => {
        // If the part matches the URL regex, render it as an anchor tag
        if (urlRegex.test(part)) {
          return (
            <a
              key={`${part}-${index}`}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-4 hover:underline break-all"
            >
              {part}
            </a>
          )
        }

        // If the part does not match the URL regex, return it with newlines preserved
        return (
          <Fragment key={`text-${index}`}>
            {renderTextWithNewlines(part, `text-${index}`)}
          </Fragment>
        )
      })}
    </p>
  )
}
