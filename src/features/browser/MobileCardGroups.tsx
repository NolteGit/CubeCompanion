import { useState, type ComponentProps } from 'react'
import { CardCollection } from './CardCollection'
import type { MobileGroup } from './mobileGroups'
import './mobileBrowser.css'

interface MobileCardGroupsProps {
  groups: readonly MobileGroup[]
  rowAction?: ComponentProps<typeof CardCollection>['rowAction']
  workingAddedIds?: ReadonlySet<string>
}

export function MobileCardGroups({ groups, rowAction, workingAddedIds }: MobileCardGroupsProps) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(groups.length ? [groups[0].key] : []),
  )

  function toggle(key: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="mobile-cube-groups" aria-label="Card groups">
      {groups.map((group) => {
        const open = expanded.has(group.key)
        return (
          <section className={`mobile-cube-group cube-theme cube-theme--${group.key}`} key={group.key}>
            <h2 className="mobile-cube-group-heading">
              <button
                type="button"
                className="mobile-cube-group-toggle"
                aria-expanded={open}
                onClick={() => toggle(group.key)}
              >
                <span className="section-dot" aria-hidden="true" />
                <span className="mobile-cube-group-name">{group.label}</span>
                <span className="mobile-cube-group-count">{group.count}</span>
                <svg className="mobile-cube-chevron" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </h2>
            {open && (
              <div className="mobile-cube-sections">
                {group.sections.map((section) => (
                  <section className="mobile-cube-section" key={section.key}>
                    <header className="mobile-cube-section-heading">
                      <strong>{section.label}</strong>
                      <span>{section.cards.length}</span>
                    </header>
                    <CardCollection
                      cards={section.cards}
                      view="list"
                      rowAction={rowAction}
                      workingAddedIds={workingAddedIds}
                    />
                  </section>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
