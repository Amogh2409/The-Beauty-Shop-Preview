import { useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { categories, categoryOf, hasMrp } from '../lib/catalogue';
import { ProductGrid } from '../components/Common';

export default function HomePage() {
  const { products, photos, categoryCounts } = useStore();
  const highlights = useMemo(() => {
    const withPhotos = ['Face', 'Hair', 'Body', 'Baby'].flatMap((category) =>
      products
        .filter((product) => categoryOf(product) === category && photos[product.id])
        .slice(0, 2),
    );
    return withPhotos.length >= 4
      ? withPhotos.slice(0, 8)
      : products.filter((product) => hasMrp(product) && categoryOf(product) === 'Face').slice(0, 8);
  }, [products, photos]);
  return (
    <>
      <section className="store-hero">
        <div className="hero-copy">
          <p className="eyebrow">THE BEAUTY EDIT · JHANSI</p>
          <h1>
            A little care.
            <br />A beautiful everyday.
          </h1>
          <p>Discover beauty and personal care for every part of your routine.</p>
          <a href="#/shop" className="button primary">
            Explore the collection
          </a>
          <span className="hero-footnote">277 reference entries · Mamaearth</span>
        </div>
        <figure className="hero-photo">
          <img
            src={`${import.meta.env.BASE_URL}assets/beauty-still-life-1024.webp`}
            srcSet={`${import.meta.env.BASE_URL}assets/beauty-still-life-640.webp 640w, ${import.meta.env.BASE_URL}assets/beauty-still-life-1024.webp 1024w, ${import.meta.env.BASE_URL}assets/beauty-still-life-1536.webp 1536w`}
            sizes="(max-width: 700px) 100vw, (max-width: 1440px) 53vw, 714px"
            fetchPriority="high"
            decoding="async"
            alt="Illustrative unbranded skincare jar and dropper bottle with plum fabric"
            width="1536"
            height="1024"
          />
          <figcaption>Illustrative still life. Not a listed product.</figcaption>
        </figure>
        <span className="hero-index" aria-hidden="true">
          01 / THE EVERYDAY EDIT
        </span>
      </section>
      <section className="shop-categories" aria-labelledby="category-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FIND YOUR RITUAL</p>
            <h2 id="category-heading">Care, in every category.</h2>
          </div>
          <a href="#/shop" className="underlined-link">
            Shop all entries
          </a>
        </div>
        <div className="category-grid">
          {categories
            .filter((category) => !['All', 'Other'].includes(category.key))
            .map((category, index) => (
              <a
                key={category.key}
                className={`category-tile category-${category.key}`}
                href={`#/shop?category=${category.key}`}
              >
                <span className="category-number">0{index + 1}</span>
                <h3>{category.title}</h3>
                <span>{categoryCounts.get(category.key) ?? 0} reference entries</span>
                <span className="category-link">Explore {category.title.toLowerCase()}</span>
              </a>
            ))}
        </div>
      </section>
      <section className="home-collection">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MEET THE COLLECTION</p>
            <h2>A place to start.</h2>
          </div>
          <a className="underlined-link" href="#/shop">
            View the full collection
          </a>
        </div>
        <p className="collection-disclaimer">
          Historical MRPs are labelled by year; imported current values are labelled separately.
          Live ordering remains closed.
        </p>
        <ProductGrid products={highlights} />
      </section>
      <section className="brand-edit">
        <div>
          <p className="eyebrow">OUR FIRST BRAND EDIT</p>
          <h2>Mamaearth</h2>
          <p>Explore the reference collection across face, hair, body and baby care.</p>
          <a className="button secondary" href="#/shop">
            Browse the brand
          </a>
        </div>
        <div className="brand-edit-note">
          <span>277</span>
          <p>source entries to explore</p>
          <p className="muted">
            Historical 2022 catalogue.
            <br />
            More brands can be added as the collection grows.
          </p>
        </div>
      </section>
      <section className="store-note">
        <p className="eyebrow">A PREVIEW, MADE TO EXPLORE</p>
        <h2>Make room for your favourites.</h2>
        <p>
          Save a wishlist, build a preview bag, and explore the shopping experience. We’re still
          confirming the details needed to open ordering.
        </p>
        <a className="underlined-link" href="#/info/about">
          About this store preview
        </a>
      </section>
    </>
  );
}
