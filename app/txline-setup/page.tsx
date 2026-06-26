"use client";

import { useMemo, useState } from "react";
import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync
} from "@solana/spl-token";

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: PublicKey;
  connect: () => Promise<{ publicKey: PublicKey }>;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signMessage?: (message: Uint8Array, display?: "utf8" | "hex") => Promise<{ signature: Uint8Array }>;
};

declare global {
  interface Window {
    solana?: PhantomProvider;
  }
}

const DEFAULT_RPC_URL = "https://solana-rpc.publicnode.com";
const TXLINE_PROGRAM_ID = new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA");
const TXLINE_MINT = new PublicKey("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL");
const SUBSCRIBE_DISCRIMINATOR = Uint8Array.from([254, 28, 191, 138, 156, 179, 183, 53]);

function toBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function encodeSubscribeData(serviceLevelId: number, weeks: number) {
  const data = new Uint8Array(11);
  data.set(SUBSCRIBE_DISCRIMINATOR, 0);
  data[8] = serviceLevelId & 0xff;
  data[9] = (serviceLevelId >> 8) & 0xff;
  data[10] = weeks & 0xff;
  return data;
}

function resolveRpcUrl(rpcUrl: string) {
  const trimmed = rpcUrl.trim() || DEFAULT_RPC_URL;
  if (trimmed.startsWith("/")) {
    return `${window.location.origin}${trimmed}`;
  }
  return trimmed;
}

async function confirmSignatureWithFallback(
  connection: Connection,
  signature: string,
  latest: { blockhash: string; lastValidBlockHeight: number }
) {
  try {
    await connection.confirmTransaction(
      { signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
      "confirmed"
    );
    return;
  } catch (confirmError) {
    const status = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
    if (status.value?.confirmationStatus === "confirmed" || status.value?.confirmationStatus === "finalized") {
      return;
    }
    if (status.value?.err) {
      throw new Error(`La transaccion fallo en Solana: ${JSON.stringify(status.value.err)}`);
    }
    throw confirmError;
  }
}

export default function TxLineSetupPage() {
  const [wallet, setWallet] = useState("");
  const [serviceLevel, setServiceLevel] = useState("12");
  const [weeks, setWeeks] = useState("4");
  const [rpcUrl, setRpcUrl] = useState(DEFAULT_RPC_URL);
  const [status, setStatus] = useState("Listo para conectar Phantom.");
  const [txSig, setTxSig] = useState("");
  const [manualTxSig, setManualTxSig] = useState("");
  const [jwt, setJwt] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const envBlock = useMemo(() => {
    if (!jwt || !apiToken) return "";
    return [
      'TXLINE_BASE_URL="https://txline.txodds.com"',
      `TXLINE_SESSION_JWT="${jwt}"`,
      `TXLINE_API_TOKEN="${apiToken}"`,
      'TXLINE_COMPETITION_ID=""',
      'TXLINE_MAX_FIXTURES="12"'
    ].join("\n");
  }, [apiToken, jwt]);

  async function connectWallet() {
    setError("");
    const phantom = window.solana;
    if (!phantom?.isPhantom) {
      setError("No encuentro Phantom en este navegador. Abre esta pagina en Chrome con la extension Phantom activa.");
      return;
    }
    const response = await phantom.connect();
    setWallet(response.publicKey.toBase58());
    setStatus("Phantom conectado. Revisa que tengas un poco de SOL para gas.");
  }

  async function activateApiForSignature(signature: string) {
    const phantom = window.solana;
    if (!phantom) {
      throw new Error("No encuentro Phantom en este navegador. Abre esta pagina en Chrome con la extension Phantom activa.");
    }
    if (!phantom.signMessage) {
      throw new Error("Tu Phantom no expone signMessage. Actualiza la extension o prueba en Chrome.");
    }

    const response = phantom.publicKey ? { publicKey: phantom.publicKey } : await phantom.connect();
    setWallet(response.publicKey.toBase58());

    const cleanSignature = signature.trim();
    if (!cleanSignature) {
      throw new Error("Pega una firma de transaccion confirmada.");
    }

    setTxSig(cleanSignature);
    setStatus("Suscripcion confirmada. Obteniendo JWT de sesion...");

    const authResponse = await fetch("/api/txline/start", { method: "POST" });
    if (!authResponse.ok) throw new Error(`No pude obtener JWT: ${authResponse.status}`);
    const authData = (await authResponse.json()) as { token?: string };
    if (!authData.token) throw new Error("La respuesta de autenticacion no incluyo token.");
    setJwt(authData.token);

    const messageString = `${cleanSignature}::${authData.token}`;
    const message = new TextEncoder().encode(messageString);
    setStatus("Phantom pedira firmar un mensaje de activacion. Esto no es una transaccion y no mueve fondos.");
    const signedMessage = await phantom.signMessage(message, "utf8");

    setStatus("Activando API token TxLINE...");
    const activationResponse = await fetch("/api/txline/activate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authData.token}`
      },
      body: JSON.stringify({
        txSig: cleanSignature,
        walletSignature: toBase64(signedMessage.signature),
        leagues: []
      })
    });
    const activationText = await activationResponse.text();
    if (!activationResponse.ok) {
      throw new Error(`Activacion fallo ${activationResponse.status}: ${activationText}`);
    }

    let token = activationText;
    try {
      const parsed = JSON.parse(activationText) as { token?: string };
      token = parsed.token ?? activationText;
    } catch {
      token = activationText;
    }

    setApiToken(token.replace(/^"|"$/g, ""));
    setStatus("Listo. Copia el bloque .env y pegalo en el archivo del dashboard.");
  }

  async function activateExistingTx() {
    setBusy(true);
    setError("");
    setApiToken("");
    setJwt("");

    try {
      await activateApiForSignature(manualTxSig || txSig);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Error desconocido";
      setError(message);
      setStatus("No se completo el flujo.");
    } finally {
      setBusy(false);
    }
  }

  async function subscribeAndActivate() {
    setBusy(true);
    setError("");
    setApiToken("");
    setJwt("");
    setTxSig("");

    try {
      const phantom = window.solana;
      if (!phantom?.publicKey) {
        throw new Error("Primero conecta Phantom.");
      }
      if (!phantom.signMessage) {
        throw new Error("Tu Phantom no expone signMessage. Actualiza la extension o prueba en Chrome.");
      }

      const user = phantom.publicKey;
      const connection = new Connection(resolveRpcUrl(rpcUrl), "confirmed");
      const serviceLevelId = Number(serviceLevel);
      const durationWeeks = Number(weeks);

      if (![1, 12].includes(serviceLevelId)) {
        throw new Error("Para el hackathon usa service level 1 o 12.");
      }
      if (!Number.isInteger(durationWeeks) || durationWeeks < 4) {
        throw new Error("TxLINE indica duracion minima de 4 semanas.");
      }

      setStatus("Construyendo transaccion gratuita de suscripcion TxLINE...");

      const [pricingMatrixPda] = PublicKey.findProgramAddressSync([Buffer.from("pricing_matrix")], TXLINE_PROGRAM_ID);
      const [tokenTreasuryPda] = PublicKey.findProgramAddressSync([Buffer.from("token_treasury_v2")], TXLINE_PROGRAM_ID);
      const userTokenAccount = getAssociatedTokenAddressSync(TXLINE_MINT, user, false, TOKEN_2022_PROGRAM_ID);
      const tokenTreasuryVault = getAssociatedTokenAddressSync(TXLINE_MINT, tokenTreasuryPda, true, TOKEN_2022_PROGRAM_ID);

      const transaction = new Transaction();
      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 220_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 })
      );
      transaction.add(
        createAssociatedTokenAccountIdempotentInstruction(
          user,
          userTokenAccount,
          user,
          TXLINE_MINT,
          TOKEN_2022_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );

      transaction.add(
        new TransactionInstruction({
          programId: TXLINE_PROGRAM_ID,
          keys: [
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: pricingMatrixPda, isSigner: false, isWritable: false },
            { pubkey: TXLINE_MINT, isSigner: false, isWritable: false },
            { pubkey: userTokenAccount, isSigner: false, isWritable: true },
            { pubkey: tokenTreasuryVault, isSigner: false, isWritable: true },
            { pubkey: tokenTreasuryPda, isSigner: false, isWritable: false },
            { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
          ],
          data: Buffer.from(encodeSubscribeData(serviceLevelId, durationWeeks))
        })
      );

      const latest = await connection.getLatestBlockhash("confirmed");
      transaction.feePayer = user;
      transaction.recentBlockhash = latest.blockhash;

      setStatus("Phantom abrira una firma. Debe ser una suscripcion TxLINE gratuita; solo deberia gastar gas de Solana.");
      const signed = await phantom.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        maxRetries: 20,
        skipPreflight: false,
        preflightCommitment: "confirmed"
      });
      await confirmSignatureWithFallback(connection, signature, latest);

      await activateApiForSignature(signature);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Error desconocido";
      setError(message);
      setStatus("No se completo el flujo.");
    } finally {
      setBusy(false);
    }
  }

  async function copyEnv() {
    if (!envBlock) return;
    await navigator.clipboard.writeText(envBlock);
    setStatus("Bloque .env copiado al portapapeles.");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100">
      <section className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">TxLINE Setup</p>
          <h1 className="mt-2 text-3xl font-semibold">Activar free tier World Cup</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Esta pagina local conecta Phantom, registra la suscripcion gratuita de TxLINE y obtiene los tokens para que
            el dashboard use datos reales. No pide seed phrase ni private key.
          </p>
        </div>

        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          Revisa Phantom antes de firmar: debe ser TxODDS/TxLINE, no debe transferir tus USDC ni pedir frase de
          recuperacion. Solo deberia cobrar gas de Solana.
        </div>

        <div className="grid gap-4 rounded-lg border border-slate-800 bg-slate-900 p-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Service level</span>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              value={serviceLevel}
              onChange={(event) => setServiceLevel(event.target.value)}
            >
              <option value="12">12 - Real-time World Cup free tier</option>
              <option value="1">1 - 60 sec delayed World Cup free tier</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Duracion semanas</span>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              min="4"
              type="number"
              value={weeks}
              onChange={(event) => setWeeks(event.target.value)}
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-slate-300">Solana RPC</span>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              value={rpcUrl}
              onChange={(event) => setRpcUrl(event.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-md bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy}
            onClick={connectWallet}
          >
            Conectar Phantom
          </button>
          <button
            className="rounded-md bg-emerald-400 px-4 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy || !wallet}
            onClick={subscribeAndActivate}
          >
            Suscribir y activar API
          </button>
          {envBlock ? (
            <button className="rounded-md bg-slate-700 px-4 py-2 font-semibold text-white" onClick={copyEnv}>
              Copiar .env
            </button>
          ) : null}
        </div>

        <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-5">
          <p className="font-semibold text-cyan-100">Si la transaccion ya quedo confirmada</p>
          <p className="mt-1 text-sm text-cyan-50/80">
            Pega aqui la firma Tx y activa solo el API token. Este paso firma un mensaje, no mueve fondos ni gasta SOL.
          </p>
          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <input
              className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="Pega la firma Tx confirmada"
              value={manualTxSig}
              onChange={(event) => setManualTxSig(event.target.value)}
            />
            <button
              className="rounded-md bg-cyan-300 px-4 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy || !(manualTxSig || txSig)}
              onClick={activateExistingTx}
            >
              Activar con Tx existente
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm uppercase tracking-[0.16em] text-slate-400">Estado</p>
          <p className="mt-2 text-slate-100">{status}</p>
          {wallet ? <p className="mt-2 break-all text-sm text-slate-400">Wallet: {wallet}</p> : null}
          {txSig ? <p className="mt-2 break-all text-sm text-slate-400">Tx: {txSig}</p> : null}
          {error ? <p className="mt-3 rounded-md bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
        </div>

        {envBlock ? (
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-5">
            <p className="font-semibold text-emerald-200">Credenciales listas</p>
            <pre className="mt-3 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">{envBlock}</pre>
          </div>
        ) : null}
      </section>
    </main>
  );
}
