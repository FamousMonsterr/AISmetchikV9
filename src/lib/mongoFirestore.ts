// @ts-nocheck
import { nanoid } from 'nanoid';

export type DocumentData = Record<string, any>;

export class FirebaseError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export class Timestamp {
  private readonly value: Date;
  constructor(seconds: number, nanoseconds: number) {
    this.value = new Date(seconds * 1000 + Math.floor(nanoseconds / 1e6));
  }
  toDate() {
    return this.value;
  }
  static now() {
    return new Timestamp(Math.floor(Date.now() / 1000), 0);
  }
  static fromDate(date: Date) {
    return new Timestamp(Math.floor(date.getTime() / 1000), 0);
  }
}

type CollectionRef = { name: string };
type DocRef = { collection: string; id: string };
type WhereFilter = { type: 'where'; field: string; op: string; value: any };
type OrderByClause = { type: 'orderBy'; field: string; direction: 'asc' | 'desc' };
type LimitClause = { type: 'limit'; count: number };
type QueryRef = {
  type: 'query';
  collection: string;
  filters: WhereFilter[];
  orderBy: OrderByClause[];
  limit?: number;
};

const isServer = typeof window === 'undefined';
const CLIENT_QUERY_CACHE_TTL_MS = Number(process.env.NEXT_PUBLIC_QUERY_CACHE_TTL_MS || 900);
const CLIENT_QUERY_MAX_CACHE_ENTRIES = Number(process.env.NEXT_PUBLIC_QUERY_CACHE_MAX_ENTRIES || 200);
const REALTIME_CHANGE_DEBOUNCE_MS = Number(process.env.NEXT_PUBLIC_REALTIME_CHANGE_DEBOUNCE_MS || 180);
const REALTIME_POLL_INTERVAL_MS = Math.max(3000, Number(process.env.NEXT_PUBLIC_REALTIME_POLL_INTERVAL_MS || 10000));

type ClientCacheEntry = {
  expiresAt: number;
  payload: any;
};

const clientQueryCache = new Map<string, ClientCacheEntry>();
const clientInFlightQueries = new Map<string, Promise<any>>();

function buildClientQueryKey(descriptor: any) {
  return JSON.stringify(descriptor);
}

function readClientCache(key: string): any | null {
  const entry = clientQueryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    clientQueryCache.delete(key);
    return null;
  }
  return entry.payload;
}

function writeClientCache(key: string, payload: any) {
  if (CLIENT_QUERY_CACHE_TTL_MS <= 0) return;
  clientQueryCache.set(key, {
    payload,
    expiresAt: Date.now() + CLIENT_QUERY_CACHE_TTL_MS,
  });
  if (clientQueryCache.size > CLIENT_QUERY_MAX_CACHE_ENTRIES) {
    const overflow = clientQueryCache.size - CLIENT_QUERY_MAX_CACHE_ENTRIES;
    for (let i = 0; i < overflow; i += 1) {
      const oldestKey = clientQueryCache.keys().next().value;
      if (!oldestKey) break;
      clientQueryCache.delete(oldestKey);
    }
  }
}

async function requestQueryPayload(descriptor: any): Promise<any> {
  const key = buildClientQueryKey(descriptor);
  const cached = readClientCache(key);
  if (cached) return cached;

  const inFlight = clientInFlightQueries.get(key);
  if (inFlight) return inFlight;

  const reqPromise = (async () => {
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(descriptor),
    });
    if (!res.ok) {
      throw new FirebaseError('realtime/fetch-failed', await res.text());
    }
    const payload = await res.json();
    writeClientCache(key, payload);
    return payload;
  })();

  clientInFlightQueries.set(key, reqPromise);
  try {
    return await reqPromise;
  } finally {
    clientInFlightQueries.delete(key);
  }
}

export function collection(_db: unknown, name: string): CollectionRef {
  return { name };
}

export function doc(collectionOrDb: CollectionRef | unknown, nameOrId?: string, id?: string): DocRef {
  if (typeof (collectionOrDb as CollectionRef)?.name === 'string') {
    const collectionName = (collectionOrDb as CollectionRef).name;
    const docId = nameOrId ?? nanoid();
    return { collection: collectionName, id: docId };
  }
  if (!nameOrId) {
    throw new Error('Collection name is required.');
  }
  const docId = id ?? nanoid();
  return { collection: nameOrId, id: docId };
}

export function where(field: string, op: string, value: any): WhereFilter {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): OrderByClause {
  return { type: 'orderBy', field, direction };
}

export function limit(count: number): LimitClause {
  return { type: 'limit', count };
}

export function query(collectionRef: CollectionRef, ...clauses: Array<WhereFilter | OrderByClause | LimitClause>): QueryRef {
  const filters: WhereFilter[] = [];
  const orderByClauses: OrderByClause[] = [];
  let limitValue: number | undefined;

  clauses.forEach((clause) => {
    if (clause.type === 'where') {
      filters.push(clause);
    } else if (clause.type === 'orderBy') {
      orderByClauses.push(clause);
    } else if (clause.type === 'limit') {
      limitValue = clause.count;
    }
  });

  return {
    type: 'query',
    collection: collectionRef.name,
    filters,
    orderBy: orderByClauses,
    limit: limitValue,
  };
}

export function serverTimestamp() {
  return new Date();
}

export function increment(value: number) {
  return { __op: 'increment', value };
}

export function arrayUnion(...values: any[]) {
  return { __op: 'arrayUnion', values };
}

function stripInternalId(doc: DocumentData) {
  const { _id, ...rest } = doc;
  return rest;
}

function createDocSnapshot(doc: DocumentData | null, collectionName?: string) {
  const exists = !!doc;
  return {
    id: doc?._id ?? null,
    ref: doc && collectionName ? { collection: collectionName, id: doc._id } : undefined,
    exists: () => exists,
    data: () => (doc ? stripInternalId(doc) : undefined),
  };
}

function createQuerySnapshot(docs: DocumentData[], collectionName?: string) {
  const docSnapshots = docs.map((doc) => ({
    id: doc._id,
    ref: collectionName ? { collection: collectionName, id: doc._id } : undefined,
    data: () => stripInternalId(doc),
  }));
  return {
    docs: docSnapshots,
    size: docSnapshots.length,
    empty: docSnapshots.length === 0,
    forEach: (callback: (doc: any) => void) => {
      docSnapshots.forEach(callback);
    },
  };
}

async function executeDocWrite(op: string, payload: any) {
  const res = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ op, ...payload }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new FirebaseError('db/request-failed', errorText || 'Database request failed.');
  }
  return res.json();
}

export async function getDoc(ref: DocRef) {
  if (isServer) {
    throw new FirebaseError('client-only', 'getDoc is client-only in this module.');
  }
  const data = await executeDocWrite('getDoc', { ref });
  return createDocSnapshot(data.doc ?? null, ref.collection);
}

export async function getDocs(ref: QueryRef | CollectionRef) {
  if (isServer) {
    throw new FirebaseError('client-only', 'getDocs is client-only in this module.');
  }
  if ((ref as QueryRef).type === 'query') {
    const data = await executeDocWrite('getDocs', { query: ref });
    return createQuerySnapshot(data.docs ?? [], (ref as QueryRef).collection);
  }
  const queryRef = query(ref as CollectionRef);
  const data = await executeDocWrite('getDocs', { query: queryRef });
  return createQuerySnapshot(data.docs ?? [], queryRef.collection);
}

export async function addDoc(ref: CollectionRef, data: DocumentData) {
  if (isServer) {
    throw new FirebaseError('client-only', 'addDoc is client-only in this module.');
  }
  const result = await executeDocWrite('addDoc', { ref, data });
  return { id: result.id };
}

export async function setDoc(ref: DocRef, data: DocumentData, options?: { merge?: boolean }) {
  if (isServer) {
    throw new FirebaseError('client-only', 'setDoc is client-only in this module.');
  }
  await executeDocWrite('setDoc', { ref, data, options });
}

export async function updateDoc(ref: DocRef, data: DocumentData) {
  if (isServer) {
    throw new FirebaseError('client-only', 'updateDoc is client-only in this module.');
  }
  await executeDocWrite('updateDoc', { ref, data });
}

export async function deleteDoc(ref: DocRef) {
  if (isServer) {
    throw new FirebaseError('client-only', 'deleteDoc is client-only in this module.');
  }
  await executeDocWrite('deleteDoc', { ref });
}

export function runTransaction() {
  throw new FirebaseError('client-only', 'Transactions are server-only.');
}

export function writeBatch() {
  throw new FirebaseError('client-only', 'Batched writes are server-only.');
}

export function onSnapshot(
  target: DocRef | QueryRef,
  onNext: (snapshot: any) => void,
  onError?: (error: FirebaseError) => void,
) {
  if (isServer) {
    throw new FirebaseError('realtime/server-only', 'Realtime subscriptions must run on the client.');
  }

  const isDoc = (target as DocRef).id !== undefined && (target as QueryRef).type !== 'query';
  const descriptor = isDoc
    ? { type: 'doc', collection: (target as DocRef).collection, id: (target as DocRef).id }
    : {
        type: 'query',
        collection: (target as QueryRef).collection,
        filters: (target as QueryRef).filters,
        orderBy: (target as QueryRef).orderBy,
        limit: (target as QueryRef).limit,
      };

  const fetchSnapshot = async () => {
    try {
      const payload = await requestQueryPayload(descriptor);
      if (descriptor.type === 'doc') {
        onNext(createDocSnapshot(payload.doc ?? null, descriptor.collection));
      } else {
        onNext(createQuerySnapshot(payload.docs ?? [], descriptor.collection));
      }
    } catch (error: any) {
      onError?.(error instanceof FirebaseError ? error : new FirebaseError('realtime/fetch-failed', error.message));
    }
  };

  const realtimeMode = process.env.NEXT_PUBLIC_REALTIME_MODE;
  if (realtimeMode === 'manual') {
    fetchSnapshot();
    return () => {};
  }

  if (realtimeMode === 'polling') {
    fetchSnapshot();
    const intervalId = window.setInterval(fetchSnapshot, REALTIME_POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }

  const url = new URL('/api/realtime', window.location.origin);
  url.searchParams.set('type', descriptor.type);
  url.searchParams.set('collection', descriptor.collection);
  if (descriptor.type === 'doc') {
    url.searchParams.set('id', descriptor.id);
  } else {
    url.searchParams.set('filters', JSON.stringify(descriptor.filters ?? []));
    url.searchParams.set('orderBy', JSON.stringify(descriptor.orderBy ?? []));
    if (descriptor.limit) {
      url.searchParams.set('limit', String(descriptor.limit));
    }
  }

  let eventSource: EventSource | null = null;
  let pollingIntervalId: number | null = null;
  let switchedToPolling = false;
  let debounceTimer: number | null = null;
  let fetchInProgress = false;
  let shouldRefetchAfterCurrent = false;

  const runFetch = async () => {
    if (fetchInProgress) {
      shouldRefetchAfterCurrent = true;
      return;
    }
    fetchInProgress = true;
    try {
      await fetchSnapshot();
    } finally {
      fetchInProgress = false;
      if (shouldRefetchAfterCurrent) {
        shouldRefetchAfterCurrent = false;
        debounceTimer = window.setTimeout(() => {
          debounceTimer = null;
          runFetch();
        }, REALTIME_CHANGE_DEBOUNCE_MS);
      }
    }
  };

  const scheduleFetch = (delay = 0) => {
    if (debounceTimer) {
      window.clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    debounceTimer = window.setTimeout(() => {
      debounceTimer = null;
      runFetch();
    }, Math.max(0, delay));
  };

  const switchToPollingFallback = () => {
    if (switchedToPolling) return;
    switchedToPolling = true;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    onError?.(new FirebaseError('realtime/connection-failed', 'Realtime SSE недоступен, переключаемся на polling.'));
    fetchSnapshot();
    pollingIntervalId = window.setInterval(fetchSnapshot, REALTIME_POLL_INTERVAL_MS);
  };

  try {
    eventSource = new EventSource(url.toString());
    eventSource.addEventListener('change', () => {
      scheduleFetch(REALTIME_CHANGE_DEBOUNCE_MS);
    });
    eventSource.onerror = () => {
      switchToPollingFallback();
    };
  } catch {
    switchToPollingFallback();
  }

  scheduleFetch(0);

  return () => {
    if (debounceTimer) {
      window.clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (pollingIntervalId) {
      window.clearInterval(pollingIntervalId);
      pollingIntervalId = null;
    }
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}
