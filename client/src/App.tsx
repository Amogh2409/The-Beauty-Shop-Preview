import { useEffect, type ReactNode } from 'react';
import { useStore } from './context/StoreContext';
import { useHashRoute } from './hooks/useHashRoute';
import { AccountGate } from './components/AccountGate';
import { StoreLayout } from './components/StoreLayout';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ProductPage from './pages/ProductPage';
import { CartPage, WishlistPage } from './pages/BagPages';
import { AccountPage, OrderPage } from './pages/AccountPages';
import CheckoutPage from './pages/CheckoutPage';
import { BusinessPage, HelpPage, InfoPage, ReadinessPage } from './pages/InformationPages';


function decodedId(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}
export default function App() {
  const route = useHashRoute();
  const { loading, catalogueError } = useStore();
  useEffect(() => {
    const section = route.path.startsWith('/account')
      ? 'Your Account'
      : route.path === '/checkout'
        ? 'Demo Checkout'
        : route.path === '/cart'
          ? 'Your Bag'
          : route.path === '/shop'
            ? 'The Collection'
            : 'Store Demo';
    document.title = `${section} · Jhansi Beauty`;
  }, [route.path]);
  let page: ReactNode;
  if (loading)
    page = (
      <div className="loading-state" role="status">
        Opening the collection…
      </div>
    );
  else if (catalogueError)
    page = (
      <div className="empty-state">
        <h1>The collection couldn’t load.</h1>
        <p>{catalogueError}</p>
        <button className="button primary" onClick={() => location.reload()}>
          Refresh page
        </button>
      </div>
    );
  else if (route.path === '/') page = <HomePage />;
  else if (route.path === '/shop')
    page = <ShopPage query={route.query} replaceQuery={route.replaceQuery} />;
  else if (route.path.startsWith('/product/'))
    page = <ProductPage id={decodedId(route.path.slice(9))} />;
  else if (route.path === '/wishlist')
    page = (
      <AccountGate>
        <WishlistPage />
      </AccountGate>
    );
  else if (route.path === '/cart')
    page = (
      <AccountGate>
        <CartPage />
      </AccountGate>
    );
  else if (route.path === '/checkout')
    page = (
      <AccountGate>
        <CheckoutPage />
      </AccountGate>
    );
  else if (route.path.startsWith('/account/order/'))
    page = (
      <AccountGate>
        <OrderPage id={decodedId(route.path.slice(15))} />
      </AccountGate>
    );
  else if (route.path === '/account' || route.path.startsWith('/account/'))
    page = (
      <AccountGate>
        <AccountPage tab={route.path.split('/')[2] || 'overview'} />
      </AccountGate>
    );
  else if (route.path === '/help') page = <HelpPage />;
  else if (route.path === '/business') page = <BusinessPage />;
  else if (route.path === '/readiness') page = <ReadinessPage />;
  else if (route.path.startsWith('/info/')) page = <InfoPage topic={route.path.slice(6)} />;
  else
    page = (
      <div className="empty-state">
        <h1>This page isn’t in the collection.</h1>
        <a href="#/shop" className="button primary">
          Explore products
        </a>
      </div>
    );
  return <StoreLayout>{page}</StoreLayout>;
}
