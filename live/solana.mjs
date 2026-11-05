// Solana devnet, for real: pay a one-time address with the announcement in a memo, find it from
// the chain alone, then spend it with a relayer as fee payer, so the one-time address never holds SOL.
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import { signSolanaMessage, solana } from '../dist/chains/solana/index.js'
import { announce, check, funderSecret, readAnnouncement, receiver, S, step } from './lib.mjs'

const NET = process.env.SOL_NET ?? 'devnet'
const RPC = `https://api.${NET}.solana.com`
const MEMO = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
const AMOUNT = 10_000_000 // 0.01 SOL
const link = (sig) => `https://explorer.solana.com/tx/${sig}?cluster=${NET}`

const conn = new Connection(RPC, 'confirmed')
const relayer = Keypair.fromSecretKey(funderSecret('solana', () => Keypair.generate().secretKey))
console.log(`Solana ${NET}`)
step('relayer (pays fees)', relayer.publicKey.toBase58())

if ((await conn.getBalance(relayer.publicKey)) < 0.05 * LAMPORTS_PER_SOL) {
  try {
    const sig = await conn.requestAirdrop(relayer.publicKey, LAMPORTS_PER_SOL)
    await conn.confirmTransaction(sig, 'confirmed')
  } catch (e) {
    console.log(`  NEED FUNDS: airdrop refused (${e.message.slice(0, 80)}). Fund ${relayer.publicKey.toBase58()} at faucet.solana.com, then rerun.`)
    process.exit(2)
  }
}
step('relayer balance', `${(await conn.getBalance(relayer.publicKey)) / LAMPORTS_PER_SOL} SOL`)

// 1. The receiver publishes a meta-address. A sender pays a fresh one-time address and puts the
//    announcement envelope in a memo in the same transaction.
const r = receiver(solana)
const payment = S.createPayment(solana, r.meta, { memo: { name: 'Ada', note: 'Rent, live on devnet' } })
const envelope = announce(solana, payment, BigInt(AMOUNT))
const stealthKey = new PublicKey(payment.stealthAddress)
step('one-time address', payment.stealthAddress)

const pay = new Transaction().add(
  SystemProgram.transfer({ fromPubkey: relayer.publicKey, toPubkey: stealthKey, lamports: AMOUNT }),
  new TransactionInstruction({ programId: MEMO, keys: [], data: Buffer.from(Buffer.from(envelope).toString('base64')) }),
)
const paySig = await conn.sendTransaction(pay, [relayer])
await conn.confirmTransaction(paySig, 'confirmed')
step('paid 0.01 SOL', link(paySig))

// 2. The receiver reads the transaction back from the chain and finds its payment in the memo.
const seen = await conn.getParsedTransaction(paySig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 })
const memo = seen.transaction.message.instructions.find((i) => i.programId.equals(MEMO))
const raw = typeof memo.parsed === 'string' ? memo.parsed : memo.parsed?.memo ?? memo.parsed
const a = readAnnouncement(solana, new Uint8Array(Buffer.from(raw, 'base64')))
check('receiver finds it from the memo on chain', S.findPayment(solana, r.view, a) === payment.stealthAddress)
const note = S.openPaymentMemo(solana, r.keys.viewingPrivateKey, a)
check('receiver opens the sealed note', note?.note === 'Rent, live on devnet')
check('the chain holds the amount', (await conn.getBalance(stealthKey)) === AMOUNT)

// 3. Spend: the one-time key signs a transfer of everything it holds; the relayer is the fee payer.
const spendKey = S.paymentPrivateKey(solana, r.keys, a.ephemeralPublicKey)
const home = Keypair.generate().publicKey
const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash()
const spend = new Transaction({ feePayer: relayer.publicKey, blockhash, lastValidBlockHeight }).add(
  SystemProgram.transfer({ fromPubkey: stealthKey, toPubkey: home, lamports: AMOUNT }),
)
spend.partialSign(relayer)
spend.addSignature(stealthKey, Buffer.from(signSolanaMessage(spendKey, spend.serializeMessage())))
check('both signatures verify locally', spend.verifySignatures())
const spendSig = await conn.sendRawTransaction(spend.serialize())
await conn.confirmTransaction({ signature: spendSig, blockhash, lastValidBlockHeight }, 'confirmed')
step('spent, relayer paid the fee', link(spendSig))
check('the one-time address is empty', (await conn.getBalance(stealthKey)) === 0)
check('the receiver’s own address got all 0.01 SOL', (await conn.getBalance(home)) === AMOUNT)
