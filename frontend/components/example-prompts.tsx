import { Card } from "@/components/ui/card"

interface ExamplePromptsProps {
  onPromptSelect: (prompt: string) => void
}

const EXAMPLE_PROMPTS = [
  {
    title: "What is this document about?",
  },
  {
    title: "What is music?",
  },
]

export function ExamplePrompts({ onPromptSelect }: ExamplePromptsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
      {EXAMPLE_PROMPTS.map((prompt, i) => (
        <Card 
          key={i} 
          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => onPromptSelect(prompt.title)}
        >
          <p className="text-sm text-center font-medium">{prompt.title}</p>
        </Card>
      ))}
    </div>
  )
}

