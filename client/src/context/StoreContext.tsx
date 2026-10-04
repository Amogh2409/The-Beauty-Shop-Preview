import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  AccountResponse,
  AccountState,
  MutationResponse,
  Operation,
  OperationResult,
  Product,
  ProductPhoto,
  User,
} from '@shared/types';
import { STORAGE_KEY } from '../lib/demoStorage';
import { ApiError, errorMessage, jsonPost, request } from '../lib/api';
import { categoryOf, boundedQuantity, searchText } from '../lib/catalogue';
import {
  belongsToAccount,
  reconcileAccountIdentity,
  changedAccountMessage,
  type PendingChange,
} from '../lib/accountIdentity';

interface SessionResponse {
  user: User | null;
  csrfToken: string | null;
}
interface AccountSnapshot {
  user: User | null;
  state: AccountState | null;
  revision: number;
  csrfToken: string | null;
  ready: boolean;
}
interface MutationOptions {
  silent?: boolean;
  requestId?: string;
}
interface StoreValue {
  products: Product[];
  photos: Record<string, ProductPhoto>;
  byId: Map<string, Product>;
  searchIndex: Map<string, string>;
  categoryCounts: Map<string, number>;
  duplicateNames: Set<string>;
  user: User | null;
  csrfToken: string | null;
  refreshCatalogue: () => Promise<void>;
  state: AccountState | null;
  wishlist: Set<string>;
  loading: boolean;
  catalogueError: string;
  accountLoading: boolean;
  accountError: string;
  busy: boolean;
  ready: boolean;
  toast: string;
  pending: PendingChange | null;
  notify: (text: string) => void;
  reloadAccount: () => Promise<boolean>;
  retryPending: () => Promise<void>;
  dismissPending: () => void;
  authenticate: () => Promise<void>;
  logout: () => Promise<void>;
  mutate: (operation: Operation, options?: MutationOptions) => Promise<OperationResult | null>;
  toggleWish: (id: string) => Promise<void>;
  addCart: (id: string, quantity?: number) => Promise<void>;
}
const emptyAccount = (): AccountSnapshot => ({
  user: null,
  state: null,
  revision: 0,
  csrfToken: null,
  ready: false,
});
const StoreContext = createContext<StoreValue | null>(null);
export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('StoreProvider is required.');
  return value;
}
export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [photos, setPhotos] = useState<Record<string, ProductPhoto>>({});
  const [loading, setLoading] = useState(true);
  const [catalogueError, setCatalogueError] = useState('');
  const [account, setAccount] = useState<AccountSnapshot>(emptyAccount);
  const accountRef = useRef(account);
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountError, setAccountError] = useState('');
  const [pending, setPending] = useState<PendingChange | null>(null);
  const pendingRef = useRef<PendingChange | null>(null);
  const retrying = useRef(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const generation = useRef(0);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const accountLoad = useRef<Promise<boolean> | null>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);
  const notify = useCallback((text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 4200);
  }, []);
  const updateAccount = useCallback((next: AccountSnapshot) => {
    accountRef.current = next;
    setAccount(next);
  }, []);
  const updatePending = useCallback((next: PendingChange | null) => {
    pendingRef.current = next;
    setPending(next);
  }, []);
  const clearAccount = useCallback(() => {
    generation.current += 1;
    updateAccount(emptyAccount());
    updatePending(null);
    setAccountError('');
  }, [updateAccount, updatePending]);
  const reloadAccount = useCallback(async (): Promise<boolean> => {
    if (accountLoad.current) return accountLoad.current;
    if (busyRef.current) {
      notify('The current save is still finishing. Please wait.');
      return false;
    }
    const epoch = generation.current;
    setAccountLoading(true);
    const task = (async () => {
      try {
        const response = await request<AccountResponse>('/api/account');
        if (epoch !== generation.current) return false;
        const identity = reconcileAccountIdentity(
          accountRef.current.user?.id ?? null,
          response.user.id,
          pendingRef.current,
        );
        if (identity.identityChanged || identity.discardedPending) generation.current += 1;
        updatePending(identity.pending);
        updateAccount({ ...response, ready: true });
        setAccountError(
          identity.identityChanged || identity.discardedPending
            ? changedAccountMessage
            : pendingRef.current
              ? 'Saved data reloaded. Retry your pending change safely, or keep the saved version.'
              : '',
        );
        return true;
      } catch (error) {
        if (epoch !== generation.current) return false;
        if (error instanceof ApiError && error.status === 401) {
          clearAccount();
        } else {
          updateAccount({ ...accountRef.current, ready: false });
          setAccountError(errorMessage(error));
        }
        return false;
      } finally {
        setAccountLoading(false);
        accountLoad.current = null;
      }
    })();
    accountLoad.current = task;
    return task;
  }, [clearAccount, notify, updateAccount, updatePending]);
  useEffect(() => {
    let disposed = false;
    request<{ products: Product[]; photos: Record<string, ProductPhoto> }>('/api/catalogue')
      .then((data) => {
        if (!disposed) {
          setProducts(data.products);
          setPhotos(data.photos);
        }
      })
      .catch((error) => {
        if (!disposed) setCatalogueError(errorMessage(error));
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    request<SessionResponse>('/api/auth/session')
      .then(async (session) => {
        if (disposed) return;
        updateAccount({ ...emptyAccount(), ...session });
        if (session.user) await reloadAccount();
        else setAccountLoading(false);
      })
      .catch((error) => {
        if (!disposed) {
          setAccountError(errorMessage(error));
          setAccountLoading(false);
        }
      });
    const refresh = (event: PageTransitionEvent) => {
      if (event.persisted) void reloadAccount();
    };
    const storageChanged = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) void reloadAccount(); };
    window.addEventListener('storage', storageChanged);
    window.addEventListener('pageshow', refresh);
    return () => {
      disposed = true;
      window.removeEventListener('storage', storageChanged);
      window.removeEventListener('pageshow', refresh);
      window.clearTimeout(toastTimer.current);
    };
  }, [reloadAccount, updateAccount]);
  const refreshCatalogue = useCallback(async () => {
    const data = await request<{ products: Product[]; photos: Record<string, ProductPhoto> }>(
      '/api/catalogue',
    );
    setProducts(data.products);
    setPhotos(data.photos);
  }, []);
  const authenticate = useCallback(
    async () => {
      const response = await request<SessionResponse>('/demo/start', { method: 'POST' });
      generation.current += 1;
      updatePending(null);
      updateAccount({ ...emptyAccount(), ...response });
      if (!(await reloadAccount()))
        throw new Error('Demo opened, but saved data could not load. Please reload your account.');
      notify('Your browser-only demo is ready.');
    },
    [notify, reloadAccount, updateAccount, updatePending],
  );
  const logout = useCallback(async () => {
    if (busyRef.current) {
      notify('Please wait for the current save to finish before signing out.');
      return;
    }
    try {
      await request('/demo/stop', jsonPost({}, accountRef.current.csrfToken ?? ''));
      clearAccount();
      window.location.hash = '/';
      notify('Demo identity closed. Saved records stay in this browser.');
    } catch (error) {
      notify(errorMessage(error));
    }
  }, [clearAccount, notify]);
  const mutate = useCallback(
    (operation: Operation, options: MutationOptions = {}): Promise<OperationResult | null> => {
      const requestId = options.requestId ?? crypto.randomUUID();
      const epoch = generation.current;
      const originatingUserId = accountRef.current.user?.id ?? null;
      const run = async (): Promise<OperationResult | null> => {
        if (epoch !== generation.current) return null;
        const current = accountRef.current;
        if (!current.user) {
          if (!options.silent) {
            notify('Open the demo identity to save this in your browser.');
            window.location.hash = '/account';
          }
          return null;
        }
        if (!belongsToAccount(originatingUserId, current.user.id)) {
          if (!options.silent) notify(changedAccountMessage);
          return null;
        }
        if (!current.ready || (pendingRef.current && pendingRef.current.requestId !== requestId)) {
          if (!options.silent)
            notify(
              'Reload your account and resolve the pending save before making another change.',
            );
          return null;
        }
        busyRef.current = true;
        setBusy(true);
        try {
          const response = await request<MutationResponse>('/api/account', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': current.csrfToken ?? '',
            },
            body: JSON.stringify({
              revision: current.revision,
              requestId,
              operation,
            }),
          });
          if (epoch !== generation.current) return null;
          updatePending(null);
          updateAccount({ ...current, ...response, ready: true });
          setAccountError('');
          return response.result;
        } catch (error) {
          if (epoch !== generation.current) return null;
          if (error instanceof ApiError && error.status === 401) {
            clearAccount();
            setAccountError('The demo identity is closed. Open it again to continue.');
          } else {
            const ambiguous =
              !(error instanceof ApiError) ||
              error.status === 0 ||
              error.status === 409 ||
              error.status >= 500;
            if (ambiguous) {
              updatePending({ operation, requestId, userId: current.user.id });
              updateAccount({ ...current, ready: false });
            } else updatePending(null);
            setAccountError(errorMessage(error));
          }
          if (!options.silent) notify(errorMessage(error));
          return null;
        } finally {
          busyRef.current = false;
          setBusy(false);
        }
      };
      const queued = chain.current.then(run, run);
      chain.current = queued;
      return queued;
    },
    [clearAccount, notify, updateAccount, updatePending],
  );
  const retryPending = useCallback(async () => {
    const saved = pendingRef.current;
    if (!saved || retrying.current) return;
    retrying.current = true;
    try {
      // Another tab may close the demo identity. Recheck before replaying a pending change.
      const session = await request<SessionResponse>('/api/auth/session');
      if (pendingRef.current?.requestId !== saved.requestId) return;
      if (
        !belongsToAccount(saved.userId, session.user?.id ?? null) ||
        !belongsToAccount(saved.userId, accountRef.current.user?.id ?? null)
      ) {
        generation.current += 1;
        updatePending(null);
        updateAccount({ ...emptyAccount(), ...session });
        if (session.user) await reloadAccount();
        setAccountError(changedAccountMessage);
        notify(changedAccountMessage);
        return;
      }
      const result = await mutate(saved.operation, { requestId: saved.requestId });
      if (result) {
        notify('Change confirmed and saved.');
        if (result.orderId) window.location.hash = `/account/order/${result.orderId}`;
      }
    } catch (error) {
      setAccountError(errorMessage(error));
      notify('Could not verify the account. The pending change has not been retried.');
    } finally {
      retrying.current = false;
    }
  }, [mutate, notify, reloadAccount, updateAccount, updatePending]);
  const dismissPending = useCallback(() => {
    updatePending(null);
    setAccountError('');
    notify('Kept the latest saved version.');
  }, [notify, updatePending]);
  const toggleWish = useCallback(
    async (id: string) => {
      if (await mutate({ type: 'wishToggle', id }))
        notify(
          accountRef.current.state?.wishlist.includes(id)
            ? 'Saved to your browser wishlist'
            : 'Removed from your wishlist',
        );
    },
    [mutate, notify],
  );
  const addCart = useCallback(
    async (id: string, quantity = 1) => {
      if (
        await mutate({
          type: 'cartAdd',
          id,
          quantity: boundedQuantity(quantity),
        })
      )
        notify('Saved to your preview bag');
    },
    [mutate, notify],
  );
  const indexes = useMemo(() => {
    const byId = new Map(products.map((product) => [product.id, product]));
    const searchIndex = new Map(products.map((product) => [product.id, searchText(product)]));
    const categoryCounts = new Map<string, number>();
    const names = new Map<string, number>();
    for (const product of products) {
      const category = categoryOf(product);
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
      names.set(product.name, (names.get(product.name) ?? 0) + 1);
    }
    return {
      byId,
      searchIndex,
      categoryCounts,
      duplicateNames: new Set([...names].filter(([, count]) => count > 1).map(([name]) => name)),
    };
  }, [products]);
  const wishlist = useMemo(() => new Set(account.state?.wishlist ?? []), [account.state?.wishlist]);
  return (
    <StoreContext.Provider
      value={{
        products,
        photos,
        ...indexes,
        user: account.user,
        csrfToken: account.csrfToken,
        refreshCatalogue,
        state: account.state,
        ready: account.ready,
        wishlist,
        loading,
        catalogueError,
        accountLoading,
        accountError,
        pending,
        busy,
        toast,
        notify,
        authenticate,
        logout,
        mutate,
        reloadAccount,
        retryPending,
        dismissPending,
        toggleWish,
        addCart,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
