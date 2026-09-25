"use client"

import React, { useState, memo } from "react"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"

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
  id,
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
      <Label htmlFor={`${id}-search-input`} className="text-xs font-medium text-foreground">
        {label}
      </Label>

      <div
        className="min-h-[38px] p-1.5 rounded-[4px] bg-background border border-input text-foreground flex flex-wrap gap-1.5 items-center focus-within:ring-1 focus-within:ring-primary focus-within:border-primary cursor-text w-full transition-colors"
        onClick={() => document.getElementById(`${id}-search-input`)?.focus()}
      >
        {itemsList.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 bg-muted/70 text-foreground border border-border text-[11px] font-medium px-2 py-0.5 rounded-[4px]"
          >
            <span>{item}</span>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleRemoveItem(item)
              }}
              className="text-muted-foreground hover:text-destructive focus:outline-none ml-0.5 cursor-pointer"
              aria-label={`Remove ${item}`}
            >
              <X className="h-3 w-3" />
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
          className="flex-1 bg-transparent text-xs outline-none border-0 p-1 text-foreground min-w-[120px] placeholder:text-muted-foreground/60"
        />
      </div>

      {dropdownOpen && (query.trim() || filteredItems.length > 0) && (
        <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-[4px] border border-border bg-popover shadow-md p-1 space-y-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {query.trim() && !popularItems.some((i) => i.toLowerCase() === query.toLowerCase()) && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                handleAddItem(query)
              }}
              className="flex w-full items-center justify-between rounded-[4px] px-2.5 py-1.5 text-xs text-primary hover:bg-muted font-medium text-left cursor-pointer"
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
              className="flex w-full items-center rounded-[4px] px-2.5 py-1.5 text-xs text-foreground hover:bg-muted text-left cursor-pointer"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})
