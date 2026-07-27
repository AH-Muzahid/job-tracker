import React, { useState, memo } from "react"
import { Label } from "@/components/ui/label"

interface SearchableTagsInputProps {
  value: string // Comma-separated values
  onChange: (newValue: string) => void
  placeholder?: string
  label: string
  popularItems: string[]
  id: string
}

export const SearchableTagsInput = memo(function SearchableTagsInput({
  value,
  onChange,
  placeholder = "Search or type...",
  label,
  popularItems,
  id
}: SearchableTagsInputProps) {
  const [query, setQuery] = useState("")
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const itemsList = value ? value.split(", ").filter(Boolean) : []
  
  const filteredItems = popularItems.filter(
    (item) => 
      item.toLowerCase().includes(query.toLowerCase()) && 
      !itemsList.includes(item)
  )

  const handleAddItem = (item: string) => {
    const trimmed = item.trim()
    if (trimmed && !itemsList.includes(trimmed)) {
      onChange([...itemsList, trimmed].join(", "))
    }
    setQuery("")
  }

  const handleRemoveItem = (item: string) => {
    onChange(itemsList.filter((i) => i !== item).join(", "))
  }

  return (
    <div className="space-y-1.5 relative w-full">
      <Label className="text-xs text-slate-655 dark:text-slate-350 font-semibold">{label}</Label>
      
      <div 
        className="min-h-[38px] p-1.5 rounded-lg bg-background border border-input text-foreground flex flex-wrap gap-1.5 items-center focus-within:border-ring cursor-text w-full"
        onClick={() => document.getElementById(`${id}-search-input`)?.focus()}
      >
        {itemsList.map((item) => (
          <span 
            key={item} 
            className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground border border-border text-[10px] font-semibold px-2 py-0.5 rounded-md"
          >
            {item}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleRemoveItem(item)
              }}
              className="text-muted-foreground hover:text-destructive font-bold focus:outline-none ml-1 cursor-pointer"
            >
              ×
            </button>
          </span>
        ))}
        
        <input
          id={`${id}-search-input`}
          type="text"
          placeholder={itemsList.length === 0 ? placeholder : ""}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setDropdownOpen(true)
          }}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => setDropdownOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              if (query.trim()) {
                handleAddItem(query)
              }
            }
          }}
          className="flex-1 bg-transparent text-xs outline-none border-0 p-0 text-foreground min-w-[120px] placeholder:text-muted-foreground/60"
        />
      </div>

      {dropdownOpen && (query.trim() || filteredItems.length > 0) && (
        <div className="absolute z-10 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-2xl p-1.5 space-y-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {query.trim() && !popularItems.some(i => i.toLowerCase() === query.toLowerCase()) && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                handleAddItem(query)
              }}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-primary hover:bg-accent hover:text-accent-foreground text-left font-semibold cursor-pointer"
            >
              Add custom: &quot;{query}&quot;
            </button>
          )}
          {filteredItems.map((item) => (
            <button
              key={item}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                handleAddItem(item)
              }}
              className="flex w-full items-center rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-accent hover:text-accent-foreground text-left cursor-pointer"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})
