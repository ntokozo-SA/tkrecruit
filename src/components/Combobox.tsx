import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { loadSearchIndex, normalize, searchIndex, type SearchIndex } from '../lib/search';

export interface ComboboxOption {
  value: string;
  custom?: boolean;
}

interface ComboboxListProps {
  id: string;
  label: string;
  show: boolean;
  loading: boolean;
  emptyText?: string;
  options: ComboboxOption[];
  activeIndex: number;
  onActiveChange: (index: number) => void;
  onSelect: (value: string) => void;
}

export function comboboxOptionId(listId: string, index: number): string {
  return `${listId}-${index}`;
}

/** The listbox shared by the single-value combobox and the skills input. */
export function ComboboxList({
  id,
  label,
  show,
  loading,
  emptyText,
  options,
  activeIndex,
  onActiveChange,
  onSelect,
}: ComboboxListProps) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, show]);

  return (
    <ul ref={listRef} id={id} role="listbox" aria-label={label} className="combobox__list" hidden={!show}>
      {show && loading && <li className="combobox__status">Loading suggestions...</li>}
      {show && !loading && emptyText && !options.length && <li className="combobox__status">{emptyText}</li>}
      {show &&
        options.map((option, i) => (
          <li
            key={`${option.custom ? 'custom' : 'match'}-${option.value}`}
            id={comboboxOptionId(id, i)}
            data-index={i}
            role="option"
            aria-selected={i === activeIndex}
            className={`combobox__option${option.custom ? ' combobox__option--custom' : ''}`}
            onMouseDown={(event) => event.preventDefault()}
            onMouseMove={() => onActiveChange(i)}
            onClick={() => onSelect(option.value)}
          >
            {option.custom ? (
              <>
                <span className="combobox__add" aria-hidden="true">
                  +
                </span>
                Add “{option.value}”
              </>
            ) : (
              option.value
            )}
          </li>
        ))}
    </ul>
  );
}

export interface ComboboxProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  invalid: boolean;
  describedBy?: string;
  placeholder: string;
  listLabel: string;
  /** URL of a JSON array of option labels, fetched the first time the field is used. */
  optionsUrl: string;
  search?: (index: SearchIndex, query: string) => string[];
  /** Lets people keep text that is not in the list, with an explicit "Add" option. */
  allowCustom?: boolean;
  noMatchesText?: string;
  maxLength?: number;
}

function cleanCustom(value: string, maxLength: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function Combobox({
  id,
  name,
  value,
  onChange,
  onBlur,
  invalid,
  describedBy,
  placeholder,
  listLabel,
  optionsUrl,
  search = searchIndex,
  allowCustom = false,
  noMatchesText = 'No matches.',
  maxLength = 120,
}: ComboboxProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const listId = `${id}-options`;
  const freeText = allowCustom || loadFailed;

  const options = useMemo<ComboboxOption[]>(() => {
    const matches: ComboboxOption[] = index ? search(index, query).map((match) => ({ value: match })) : [];
    const custom = cleanCustom(query, maxLength);
    const listed = matches.some((option) => normalize(option.value) === normalize(custom));
    if (allowCustom && custom.length >= 2 && !listed) matches.push({ value: custom, custom: true });
    return matches;
  }, [index, query, search, allowCustom, maxLength]);

  const showList = open && query.trim().length > 0 && !loadFailed;

  function ensureLoaded() {
    if (index || loadFailed) return;
    loadSearchIndex(optionsUrl).then(setIndex, () => setLoadFailed(true));
  }

  function select(option: string) {
    setQuery(option);
    setOpen(false);
    onChange(option);
  }

  function handleInput(next: string) {
    setQuery(next);
    setOpen(true);
    setActiveIndex(0);
    if (freeText) onChange(cleanCustom(next, maxLength));
    else if (value) onChange('');
  }

  function handleBlur() {
    setOpen(false);
    const typed = normalize(query);
    const exact = index && typed ? search(index, query).find((match) => normalize(match) === typed) : undefined;
    if (exact) select(exact);
    else if (freeText) setQuery(cleanCustom(query, maxLength));
    onBlur();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!showList) {
        setOpen(true);
        return;
      }
      if (!options.length) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => (current + step + options.length) % options.length);
    } else if (event.key === 'Enter' && showList && options[activeIndex]) {
      event.preventDefault();
      select(options[activeIndex].value);
    } else if (event.key === 'Escape' && showList) {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="combobox">
      <input
        id={id}
        name={name}
        type="text"
        className="input combobox__input"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && options[activeIndex] ? comboboxOptionId(listId, activeIndex) : undefined}
        aria-required="true"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        spellCheck={false}
        maxLength={maxLength}
        placeholder={placeholder}
        value={query}
        onFocus={ensureLoaded}
        onPointerEnter={ensureLoaded}
        onChange={(event) => handleInput(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
      <ComboboxList
        id={listId}
        label={listLabel}
        show={showList}
        loading={!index}
        emptyText={allowCustom ? undefined : noMatchesText}
        options={options}
        activeIndex={activeIndex}
        onActiveChange={setActiveIndex}
        onSelect={select}
      />
    </div>
  );
}
