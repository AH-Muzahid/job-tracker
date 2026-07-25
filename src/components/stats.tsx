import { cn } from "@/lib/utils"

interface StatItem {
    value?: string
    label?: string
    subtext?: string
}

interface StatsSectionProps {
    title?: string
    description?: string
    items?: StatItem[]
    className?: string
}

export default function StatsSection({ title, description, items, className }: StatsSectionProps) {
    return (
        <section className={cn("py-6 md:py-10", className)}>
            <div className="mx-auto max-w-5xl space-y-4 px-6 md:space-y-6">
                {(title || description) && (
                    <div className="relative z-10 mx-auto max-w-xl space-y-4 text-center">
                        {title && <h2 className="text-3xl font-medium lg:text-4xl">{title}</h2>}
                        {description && <p className="text-sm text-muted-foreground">{description}</p>}
                    </div>
                )}

                {items && items.length > 0 && (
                    <div className={cn(
                        "grid gap-6 divide-y *:text-center md:gap-0 md:divide-x md:divide-y-0",
                        items.length === 3 && "md:grid-cols-3",
                        items.length === 4 && "md:grid-cols-4",
                        items.length === 5 && "md:grid-cols-5",
                        items.length === 6 && "md:grid-cols-6",
                    )}>
                        {items.map((item, i) => (
                            <div key={i} className="space-y-1 py-4 md:py-0 md:px-4 first:pl-0 last:pr-0">
                                {item.value && <div className="text-3xl font-bold">{item.value}</div>}
                                {item.label && <p className="text-sm font-medium">{item.label}</p>}
                                {item.subtext && <p className="text-xs text-muted-foreground">{item.subtext}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}
