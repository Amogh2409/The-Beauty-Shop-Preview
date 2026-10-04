import { useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  categories,
  categoryOf,
  hasReferencePrice,
  referenceUnitMinor,
  matchesToken,
  normalizeSearch,
} from '../lib/catalogue';
import { PageHeading, ProductGrid } from '../components/Common';
import { SearchIcon } from '../components/Icons';

const pageSizes = new Map<string, number>();
interface FilterState {
  q: string;
  category: string;
  sort: string;
  type: string;
  price: string;
}
export default function ShopPage({
  query,
  replaceQuery,
}: {
  query: string;
  replaceQuery: (query: string) => void;
}) {
  const { products, searchIndex, categoryCounts } = useStore();
  const [, setPaginationVersion] = useState(0);
  const pageSize = pageSizes.get(query) ?? 24;
  const sourceTypes = useMemo(
    () =>
      [
        ...new Set(
          products
            .map((product) => product.subcategory)
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort(),
    [products],
  );
  const filters = useMemo<FilterState>(() => {
    const params = new URLSearchParams(query);
    return {
      q: (params.get('q') ?? '').slice(0, 200),
      category: categories.some((category) => category.key === params.get('category'))
        ? params.get('category')!
        : 'All',
      sort: ['name', 'name-desc', 'mrp-asc', 'mrp-desc'].includes(params.get('sort') ?? '')
        ? params.get('sort')!
        : 'name',
      type: sourceTypes.includes(params.get('type') ?? '') ? params.get('type')! : '',
      price: ['known', 'missing'].includes(params.get('price') ?? '') ? params.get('price')! : '',
    };
  }, [query, sourceTypes]);
  const results = useMemo(() => {
    const tokens = normalizeSearch(filters.q).split(' ').filter(Boolean);
    const matches = products.filter(
      (product) =>
        (filters.category === 'All' || categoryOf(product) === filters.category) &&
        (!filters.type || product.subcategory === filters.type) &&
        (!filters.price ||
          (filters.price === 'known' ? hasReferencePrice(product) : !hasReferencePrice(product))) &&
        tokens.every((token) => matchesToken(searchIndex.get(product.id) ?? '', token)),
    );
    if (filters.sort.startsWith('mrp'))
      return matches.sort((left, right) => {
        if (!hasReferencePrice(left)) return hasReferencePrice(right) ? 1 : 0;
        if (!hasReferencePrice(right)) return -1;
        return (
          (filters.sort === 'mrp-desc' ? -1 : 1) *
            ((referenceUnitMinor(left) ?? 0) - (referenceUnitMinor(right) ?? 0)) ||
          left.name.localeCompare(right.name)
        );
      });
    return matches.sort(
      (left, right) =>
        (filters.sort === 'name-desc' ? -1 : 1) * left.name.localeCompare(right.name),
    );
  }, [products, searchIndex, filters]);
  function change(updates: Partial<FilterState>) {
    const next = { ...filters, ...updates };
    const params = new URLSearchParams();
    if (next.category !== 'All') params.set('category', next.category);
    if (next.q) params.set('q', next.q);
    if (next.sort !== 'name') params.set('sort', next.sort);
    if (next.type) params.set('type', next.type);
    if (next.price) params.set('price', next.price);
    pageSizes.set(params.toString(), 24);
    replaceQuery(params.toString());
  }
  const reset = () => change({ q: '', category: 'All', sort: 'name', type: '', price: '' });
  const active: { key: keyof FilterState; label: string }[] = [];
  if (filters.q) active.push({ key: 'q', label: `Search: ${filters.q}` });
  if (filters.category !== 'All')
    active.push({
      key: 'category',
      label: categories.find((category) => category.key === filters.category)!.title,
    });
  if (filters.type) active.push({ key: 'type', label: filters.type });
  if (filters.price)
    active.push({
      key: 'price',
      label: filters.price === 'known' ? 'Price available' : 'Price missing',
    });
  return (
    <>
      <PageHeading eyebrow="THE REFERENCE COLLECTION" title="Beauty, your way.">
        Explore {products.length} entries, including the preserved 277-entry historical Mamaearth
        collection.
      </PageHeading>
      <section id="catalogue" className="catalogue">
        <div className="search-row">
          <label className="search-box" htmlFor="search">
            <SearchIcon />
            <input
              id="search"
              type="search"
              placeholder="Try onion shampoo, 200 ml or a source code"
              aria-label="Search by product, size or source code"
              maxLength={200}
              value={filters.q}
              autoComplete="off"
              onChange={(event) => change({ q: event.target.value })}
            />
          </label>
          <label className="sort-box">
            Sort by
            <select
              id="sort"
              value={filters.sort}
              onChange={(event) => change({ sort: event.target.value })}
            >
              <option value="name">Name: A–Z</option>
              <option value="name-desc">Name: Z–A</option>
              <option value="mrp-asc">Reference price: low to high</option>
              <option value="mrp-desc">Reference price: high to low</option>
            </select>
          </label>
        </div>
        <div className="category-filters" role="group" aria-label="Filter by category">
          {categories.map((category) => (
            <button
              key={category.key}
              className="category-filter"
              aria-pressed={filters.category === category.key}
              onClick={() => change({ category: category.key })}
            >
              {category.title}
              <span className="count">
                {category.key === 'All' ? products.length : (categoryCounts.get(category.key) ?? 0)}
              </span>
            </button>
          ))}
        </div>
        <div className="extra-filters">
          <label>
            Source product type
            <select
              id="type-filter"
              value={filters.type}
              onChange={(event) => change({ type: event.target.value })}
            >
              <option value="">All source types</option>
              {sourceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Reference price
            <select
              id="price-filter"
              value={filters.price}
              onChange={(event) => change({ price: event.target.value })}
            >
              <option value="">All entries</option>
              <option value="known">Reference price available</option>
              <option value="missing">Reference price missing</option>
            </select>
          </label>
          <button className="button secondary" onClick={reset}>
            Reset filters
          </button>
        </div>
        <p className="filter-note">
          Matches all search words across names, sizes and source codes. Source types reproduce the
          historical sheet and may need correction.
        </p>
        <div id="active-filters" className="active-filters" aria-label="Active filters">
          {active.map((filter) => (
            <button
              key={filter.key}
              aria-label={`Remove filter: ${filter.label}`}
              onClick={() => {
                change({
                  [filter.key]: filter.key === 'category' ? 'All' : '',
                });
                document.getElementById('search')?.focus();
              }}
            >
              {filter.label} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
        <div className="collection-heading">
          <div>
            <h2 id="collection-title">
              {categories.find((category) => category.key === filters.category)?.label}
            </h2>
            <p id="result-count" role="status" aria-live="polite">
              {results.length} matching {results.length === 1 ? 'entry' : 'entries'}
              {filters.q ? ` for “${filters.q}”` : ''}
            </p>
          </div>
          <p className="reference-note">
            <span className="reference-symbol" aria-hidden="true">
              i
            </span>{' '}
            Historical and current values are labelled separately
          </p>
        </div>
        <div id="results">
          {results.length ? (
            <ProductGrid products={results.slice(0, pageSize)} />
          ) : (
            <div className="empty-state">
              <h3>No matching entries</h3>
              <p>Try a shorter product name or a different category.</p>
              <button className="button primary" onClick={reset}>
                Clear filters
              </button>
            </div>
          )}
        </div>
        <div className="load-area">
          <p id="shown-count">
            {results.length
              ? `Showing ${Math.min(pageSize, results.length)} of ${results.length} entries`
              : ''}
          </p>
          {pageSize < results.length && (
            <button
              id="load-more"
              className="button secondary"
              onClick={() => {
                pageSizes.set(query, pageSize + 24);
                setPaginationVersion((version) => version + 1);
              }}
            >
              Show more entries
            </button>
          )}
        </div>
      </section>
    </>
  );
}
