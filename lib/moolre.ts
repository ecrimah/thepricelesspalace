/**
 * Moolre payment gateway helper.
 *
 * Flow used by this app: the "Generate Payment Link" (hosted Web POS) endpoint,
 * which returns an authorization_url we redirect the customer to — analogous to
 * Paystack's transaction/initialize. Payment is then confirmed authoritatively
 * via the "Payment Status" endpoint (never by trusting a redirect/webhook alone).
 *
 * Docs: https://docs.moolre.com
 *   - Generate Payment Link: POST {BASE}/embed/link
 *   - Payment Status:        POST {BASE}/open/transact/status
 * Both authenticate with X-API-USER + X-API-PUBKEY headers.
 */

const MOOLRE_BASE = (process.env.MOOLRE_BASE_URL || 'https://api.moolre.com').replace(/\/+$/, '');

export interface MoolreConfig {
    apiUser: string;
    pubKey: string;
    accountNumber: string;
}

/** Read + validate Moolre config from env. Returns null if anything is missing. */
export function getMoolreConfig(): MoolreConfig | null {
    const apiUser = process.env.MOOLRE_API_USER;
    const pubKey = process.env.MOOLRE_API_PUBKEY;
    const accountNumber = process.env.MOOLRE_ACCOUNT_NUMBER;
    if (!apiUser || !pubKey || !accountNumber) return null;
    return { apiUser, pubKey, accountNumber };
}

function moolreHeaders(cfg: MoolreConfig): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'X-API-USER': cfg.apiUser,
        'X-API-PUBKEY': cfg.pubKey,
    };
}

export interface GeneratePaymentLinkArgs {
    cfg: MoolreConfig;
    amount: number;
    email: string;
    externalRef: string;
    callbackUrl?: string;
    redirectUrl?: string;
    metadata?: Record<string, unknown>;
}

export interface GeneratePaymentLinkResult {
    ok: boolean;
    url?: string;
    reference?: string;
    message?: string;
    raw?: any;
}

/** Create a hosted Moolre payment page and return its authorization_url. */
export async function generatePaymentLink(args: GeneratePaymentLinkArgs): Promise<GeneratePaymentLinkResult> {
    const { cfg, amount, email, externalRef, callbackUrl, redirectUrl, metadata } = args;

    const body: Record<string, unknown> = {
        type: 1,
        amount: amount.toFixed(2),
        email,
        externalref: externalRef,
        reusable: '0',
        currency: 'GHS',
        accountnumber: cfg.accountNumber,
    };
    if (callbackUrl) body.callback = callbackUrl;
    if (redirectUrl) body.redirect = redirectUrl;
    if (metadata) body.metadata = metadata;

    try {
        const res = await fetch(`${MOOLRE_BASE}/embed/link`, {
            method: 'POST',
            headers: moolreHeaders(cfg),
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(20_000),
        });

        const result = await res.json().catch(() => ({}));
        const url = result?.data?.authorization_url;

        if (Number(result?.status) === 1 && url) {
            return { ok: true, url, reference: result?.data?.reference, raw: result };
        }
        return { ok: false, message: result?.message || 'Failed to generate payment link', raw: result };
    } catch (err: any) {
        return { ok: false, message: err?.message || 'Network error contacting Moolre', raw: null };
    }
}

export interface MoolreStatusResult {
    ok: boolean;          // API call itself succeeded
    success: boolean;     // payment is confirmed successful (txstatus === 1)
    amount?: number;      // confirmed amount in GHS
    transactionId?: string;
    externalRef?: string;
    message?: string;
    raw?: any;
}

/**
 * Check the authoritative status of a payment by its externalref.
 * idtype "1" = look up by our unique externalref.
 */
export async function checkPaymentStatus(cfg: MoolreConfig, externalRef: string): Promise<MoolreStatusResult> {
    try {
        const res = await fetch(`${MOOLRE_BASE}/open/transact/status`, {
            method: 'POST',
            headers: moolreHeaders(cfg),
            signal: AbortSignal.timeout(20_000),
            body: JSON.stringify({
                type: 1,
                idtype: '1',
                id: externalRef,
                accountnumber: cfg.accountNumber,
            }),
        });

        const result = await res.json().catch(() => ({}));
        const data = result?.data || {};
        const apiOk = Number(result?.status) === 1;
        const paid = apiOk && Number(data?.txstatus) === 1;

        // Moolre returns amount/value as strings (e.g. "1" or "100.00")
        const rawAmount = data?.value ?? data?.amount;
        const amount = rawAmount !== undefined && rawAmount !== null ? Number(rawAmount) : undefined;

        return {
            ok: apiOk,
            success: paid,
            amount: Number.isFinite(amount as number) ? (amount as number) : undefined,
            transactionId: data?.transactionid ? String(data.transactionid) : undefined,
            externalRef: data?.externalref ? String(data.externalref) : externalRef,
            message: result?.message,
            raw: result,
        };
    } catch (err: any) {
        return { ok: false, success: false, message: err?.message || 'Network error contacting Moolre', raw: null };
    }
}
